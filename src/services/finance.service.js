const repository = require('../repositories/finance.repository');
const validate = require('../utils/validate');
const { ApiError } = require('../utils/errors');

async function report(query) {
  const from = query.from ? validate.date(query.from) : null;
  const to = query.to ? validate.date(query.to) : null;
  if (from && to && from > to) throw new ApiError(400, 'Rango de fechas inválido');
  const appointments = await repository.listAppointments(from, to);
  const summary = Object.fromEntries(['scheduled', 'completed', 'cancelled'].map((status) => [status, { count: 0, value: 0 }]));
  for (const appointment of appointments) {
    if (!summary[appointment.status]) continue;
    summary[appointment.status].count += 1;
    summary[appointment.status].value += Number(appointment.price_at_booking);
  }
  return { from, to, summary, appointments };
}

module.exports = { report, listToday: repository.listToday };
