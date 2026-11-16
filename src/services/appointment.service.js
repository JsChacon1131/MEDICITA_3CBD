const repository = require('../repositories/base.repository');
const appointmentRepository = require('../repositories/appointment.repository');
const doctorRepository = require('../repositories/doctor.repository');
const patientRepository = require('../repositories/patient.repository');
const { runInTransaction } = require('../repositories/transaction');
const validate = require('../utils/validate');
const { buildFreeSlots } = require('../utils/schedule');
const { ApiError } = require('../utils/errors');
const {
  CLINIC_UTC_OFFSET,
  MAX_APPOINTMENT_MINUTES,
  DEFAULT_APPOINTMENT_MINUTES
} = require('../config/constants');

const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'];

async function list(patientId, date) {
  return appointmentRepository.findAll({
    patientId: patientId === undefined ? undefined : validate.id(patientId),
    date: date === undefined ? undefined : validate.date(date)
  });
}

async function get(appointmentId) {
  const appointment = await repository.one('appointments', validate.id(appointmentId));
  if (!appointment) throw new ApiError(404, 'Cita no encontrada');
  return appointment;
}

async function availability(doctorId, date) {
  const validDoctorId = validate.id(doctorId);
  const validDate = validate.date(date);
  if (!(await doctorRepository.isActive(validDoctorId))) {
    throw new ApiError(404, 'Médico no disponible');
  }

  const workingBlocks = await doctorRepository.findWorkingBlocks(validDoctorId, validDate);
  const busyRanges = await appointmentRepository.findBusyRanges(validDoctorId, validDate);
  const slots = buildFreeSlots({
    date: validDate,
    workingBlocks,
    busyRanges,
    utcOffset: CLINIC_UTC_OFFSET
  });
  return { doctor_id: validDoctorId, date: validDate, slots };
}

function parseBooking(body) {
  const startsAt = validate.dateTime(body.starts_at);
  const startsAtInstant = new Date(`${startsAt.replace(' ', 'T')}${CLINIC_UTC_OFFSET}`);
  if (startsAtInstant.getTime() <= Date.now()) {
    throw new ApiError(400, 'No se permiten citas en fechas pasadas');
  }

  const durationMinutes = validate.integer(
    body.duration_minutes ?? DEFAULT_APPOINTMENT_MINUTES,
    'duration_minutes'
  );
  if (durationMinutes > MAX_APPOINTMENT_MINUTES) {
    throw new ApiError(400, `Duración máxima: ${MAX_APPOINTMENT_MINUTES} minutos`);
  }

  return {
    patientId: validate.id(body.patient_id),
    doctorId: validate.id(body.doctor_id),
    startsAt,
    durationMinutes
  };
}

async function lockBookableDoctor(connection, { patientId, doctorId }) {
  const patientExists = await patientRepository.exists(connection, patientId);
  const doctor = await doctorRepository.lockForBooking(connection, doctorId);
  if (!patientExists || !doctor || !doctor.active) {
    throw new ApiError(400, 'Paciente o médico no disponible');
  }
  return doctor;
}

async function create(body) {
  const booking = parseBooking(body);
  const appointmentId = await runInTransaction(async (connection) => {
    const doctor = await lockBookableDoctor(connection, booking);
    if (await appointmentRepository.hasConflict(connection, booking)) {
      throw new ApiError(409, 'El médico ya tiene una cita en ese horario');
    }
    if (!(await doctorRepository.hasWorkingBlockFor(connection, booking))) {
      throw new ApiError(409, 'La cita está fuera del horario de atención del médico');
    }
    return appointmentRepository.insertScheduled(connection, booking, doctor.consultation_price);
  });
  return get(appointmentId);
}

function appointmentInstant(value) {
  if (value instanceof Date) return value.getTime();
  return new Date(`${String(value).replace(' ', 'T').slice(0, 19)}${CLINIC_UTC_OFFSET}`).getTime();
}

function assertEditable(appointment) {
  if (appointment.status !== 'scheduled') {
    throw new ApiError(409, 'Solo se pueden modificar citas programadas');
  }
  if (appointmentInstant(appointment.starts_at) <= Date.now()) {
    throw new ApiError(409, 'La cita ya comenzó o pasó');
  }
}

function validateChanges(body, user) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Solicitud de actualización inválida');
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || !['status', 'starts_at'].includes(keys[0])) {
    throw new ApiError(400, 'Solo se permite cambiar status o starts_at');
  }
  if (keys[0] === 'status') {
    const status = validate.choice(body.status, 'status', APPOINTMENT_STATUSES);
    if (user.role !== 'admin' && status !== 'cancelled') {
      throw new ApiError(403, 'El paciente únicamente puede cancelar su cita');
    }
    return { status };
  }
  return { startsAt: validate.dateTime(body.starts_at) };
}

async function edit(appointmentId, body, user) {
  const id = validate.id(appointmentId);
  const changes = validateChanges(body, user);
  const original = await get(id);
  const doctorId = validate.id(original.doctor_id);
  await runInTransaction(async (connection) => {
    const doctor = await doctorRepository.lockForBooking(connection, doctorId);
    const current = await appointmentRepository.lockAppointment(connection, id);
    if (!current) throw new ApiError(404, 'Cita no encontrada');
    if (user.role !== 'admin' && Number(current.patient_id) !== Number(user.patientId)) {
      throw new ApiError(403, 'No puede modificar citas de otro paciente');
    }
    if ('status' in changes) {
      if (current.status === 'completed' && changes.status !== 'completed') {
        throw new ApiError(409, 'Una cita atendida no puede reabrirse');
      }
      if (user.role !== 'admin') assertEditable(current);
      await appointmentRepository.updateAppointment(connection, id, { status: changes.status });
      return;
    }
    assertEditable(current);
    const booking = {
      doctorId,
      startsAt: changes.startsAt,
      durationMinutes: Number(current.duration_minutes)
    };
    const startsAtInstant = new Date(`${booking.startsAt.replace(' ', 'T')}${CLINIC_UTC_OFFSET}`);
    if (startsAtInstant.getTime() <= Date.now()) {
      throw new ApiError(400, 'No se permiten citas en fechas pasadas');
    }
    if (!doctor || !doctor.active) {
      throw new ApiError(409, 'Médico no disponible');
    }
    if (!(await doctorRepository.hasWorkingBlockFor(connection, booking))) {
      throw new ApiError(409, 'Horario fuera de la jornada del especialista');
    }
    if (await appointmentRepository.hasConflict(connection, booking, id)) {
      throw new ApiError(409, 'El médico ya tiene una cita en ese horario');
    }
    await appointmentRepository.updateAppointment(connection, id, { starts_at: booking.startsAt });
  });
  return get(id);
}

async function erase(appointmentId) {
  const appointment = await get(appointmentId);
  await repository.remove('appointments', appointment.id);
}

module.exports = { list, get, create, edit, erase, availability };
