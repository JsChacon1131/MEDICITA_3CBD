const app = document.getElementById('app');
const notification = document.getElementById('notification');
const session = { token: null, user: null, screen: 'home', doctorId: null, slot: null };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function notify(message, isError = false) {
  notification.textContent = message;
  notification.className = `notification${isError ? ' error' : ''}`;
  notification.hidden = false;
  notification.onclick = () => { notification.hidden = true; };
}

function setLoading(message = 'Cargando información desde el servidor...') {
  const content = document.getElementById('screen-content');
  if (content) content.innerHTML = `<div class="loading"><span class="spinner"></span>${escapeHtml(message)}</div>`;
}

async function request(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...options.headers };
  if (session.token) headers.authorization = `Bearer ${session.token}`;
  let response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revise su conexión.');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && session.user) {
      session.token = null;
      session.user = null;
      renderAuth();
    }
    throw new Error(data?.error || `La solicitud falló (${response.status})`);
  }
  return data;
}

function handleError(error) {
  notify(error.message || 'Ocurrió un error inesperado', true);
  const content = document.getElementById('screen-content');
  if (content && content.querySelector('.loading')) content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
}

function renderAuth(isRegistration = false) {
  app.innerHTML = `<section class="auth-wrap"><div class="auth-shell">
    <aside class="auth-brand"><div><div class="brand-name">MediCita</div><p class="eyebrow">Red asistencial digital · Portal pacientes</p><span class="badge">Plataforma de gestión médica</span><h1>Tu salud conectada, precisa y siempre al alcance.</h1><p>Gestiona tus consultas, especialistas y resultados en un mismo lugar.</p>
    <div class="brand-feature"><strong>Agendamiento inmediato</strong><p>Consulta horarios médicos disponibles y reserva una cita.</p></div><div class="brand-feature"><strong>Resultados en línea</strong><p>Accede a los resultados asociados a tu cuenta.</p></div><div class="brand-feature"><strong>Acceso protegido</strong><p>Verificación de contraseñas en el servidor.</p></div><div class="auth-photo-strip" aria-hidden="true"><img src="/assets/doctors/portrait-1.webp" alt=""><img src="/assets/doctors/portrait-2.webp" alt=""><img src="/assets/doctors/portrait-3.webp" alt=""></div><small>Portal MediCita · Atención digital</small></aside>
    <div class="auth-panel"><div class="auth-form"><span class="badge">Portal autenticado</span><h2>${isRegistration ? 'Crear una cuenta' : 'Bienvenido de vuelta'}</h2><p class="muted">${isRegistration ? 'Registra tus datos para comenzar a gestionar tus citas.' : 'Ingresa con el correo y la contraseña registrados en MediCita.'}</p>
    <form id="auth-form">${isRegistration ? '<label for="full-name">Nombre completo</label><input id="full-name" name="full_name" required minlength="3"><label for="phone">Teléfono (opcional)</label><input id="phone" name="phone" autocomplete="tel">' : ''}<label for="email">Correo electrónico</label><input type="email" id="email" name="email" autocomplete="email" required><label for="password">Contraseña</label><input type="password" id="password" name="password" autocomplete="${isRegistration ? 'new-password' : 'current-password'}" required ${isRegistration ? 'minlength="10"' : ''}><p class="helper">${isRegistration ? 'Usa al menos 10 caracteres.' : 'Utiliza la contraseña de tu cuenta.'}</p><button class="button" type="submit">${isRegistration ? 'Registrarme' : 'Iniciar sesión'}</button></form>
    <p class="switch">${isRegistration ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'} <a href="#" id="auth-switch">${isRegistration ? 'Iniciar sesión' : 'Registrarme'}</a></p></div></div></div></section>`;
  document.getElementById('auth-switch').onclick = (event) => { event.preventDefault(); renderAuth(!isRegistration); };
  document.getElementById('auth-form').onsubmit = async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    button.disabled = true;
    button.textContent = 'Procesando...';
    try {
      if (isRegistration) {
        const patient = await request('/patients', { method: 'POST', body: JSON.stringify({ full_name: fields.full_name, email: fields.email, phone: fields.phone || null }) });
        await request('/users', { method: 'POST', body: JSON.stringify({ patient_id: patient.id, email: fields.email, password: fields.password, role: 'patient' }) });
        notify('Cuenta registrada. Ya puedes iniciar sesión.');
        renderAuth();
      } else {
        const result = await request('/users/sessions', { method: 'POST', body: JSON.stringify({ email: fields.email, password: fields.password }) });
        session.token = result.token;
        session.user = result.user;
        notify('Sesión iniciada correctamente');
        await navigate('home');
      }
    } catch (error) { handleError(error); }
    finally { button.disabled = false; button.textContent = isRegistration ? 'Registrarme' : 'Iniciar sesión'; }
  };
}

function renderShell() {
  const isAdmin = session.user.role === 'admin';
  const navigation = [['home', 'Inicio'], ['doctors', 'Especialistas'], ['book', 'Agendar cita'], ['appointments', 'Mis citas'], ['results', 'Resultados'], ['reviews', 'Reseñas'], ...(isAdmin ? [['admin', 'Gestión']] : [])];
  app.innerHTML = `<header class="app-header"><strong class="brand-name">MediCita</strong><nav class="nav" aria-label="Navegación principal">${navigation.map(([name, label]) => `<button type="button" data-screen="${name}" class="${session.screen === name ? 'active' : ''}">${label}</button>`).join('')}<button type="button" id="logout">Cerrar sesión</button></nav></header><div class="container"><section id="screen-content"></section></div><footer class="footer">MediCita · Portal del paciente</footer>`;
  document.querySelectorAll('[data-screen]').forEach((button) => button.onclick = () => navigate(button.dataset.screen));
  document.getElementById('logout').onclick = () => { session.user = null; session.token = null; session.screen = 'home'; renderAuth(); notify('Sesión cerrada'); };
}

async function navigate(screen) {
  if (!session.user) return renderAuth();
  session.screen = screen;
  renderShell();
  setLoading();
  try {
    if (screen === 'home') await renderHome();
    else if (screen === 'doctors') await renderDoctors();
    else if (screen === 'book') await renderBooking();
    else if (screen === 'appointments') await renderAppointments();
    else if (screen === 'results') await renderResults();
    else if (screen === 'reviews') await renderReviews();
    else if (screen === 'admin' && session.user.role === 'admin') await renderAdmin();
  } catch (error) { handleError(error); }
}

async function renderHome() {
  const [doctors, appointments] = await Promise.all([request('/doctors'), request('/appointments')]);
  const future = appointments.filter((item) => item.status === 'scheduled' && new Date(item.starts_at).getTime() >= Date.now()).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  document.getElementById('screen-content').innerHTML = `<section class="hero home-hero"><div class="hero-copy"><span class="badge">Portal de pacientes activo</span><h1>Tu salud, siempre cerca de ti</h1><p>Consulta especialistas, reserva nuevas citas y revisa tus atenciones médicas desde un solo lugar.</p><button class="button" id="home-book">Agendar una cita</button></div><div class="hero-portrait" aria-hidden="true"><img src="/assets/doctors/portrait-2.webp" alt=""></div></section><div class="grid two"><section class="panel"><h2>Tu próxima cita</h2>${future.length ? appointmentDetail(future[0]) : '<div class="empty">No tienes próximas citas programadas.</div>'}</section><section class="panel"><h2>Especialistas disponibles</h2><p class="muted">${doctors.length} profesionales en el catálogo.</p><button class="button secondary" id="home-doctors">Explorar especialistas</button></section></div>`;
  document.getElementById('home-book').onclick = () => navigate('book');
  document.getElementById('home-doctors').onclick = () => navigate('doctors');
}

function appointmentDetail(item) {
  return `<strong>Cita #${escapeHtml(item.id)}</strong><p>${formatDate(item.starts_at)}</p><p class="muted">Especialista #${escapeHtml(item.doctor_id)} · <span class="pill ${item.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(item.status)}</span></p>`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

async function renderDoctors() {
  const [doctors, specialties] = await Promise.all([request('/doctors'), request('/specialties')]);
  const specialtyNames = new Map(specialties.map((item) => [item.id, item.name]));
  const specialtyOptions = [...new Set(doctors.map((doctor) => specialtyNames.get(doctor.specialty_id) || 'Medicina'))].sort((a, b) => a.localeCompare(b, 'es'));
  document.getElementById('screen-content').innerHTML = `<section class="hero doctors-hero"><div class="hero-copy"><span class="badge">Directorio clínico</span><h1>Nuestros especialistas</h1><p>Encuentra un profesional de salud, revisa sus horarios y agenda tu cita en línea.</p></div><div class="hero-portrait" aria-hidden="true"><img src="/assets/doctors/portrait-3.webp" alt=""></div></section><section class="directory-controls"><div class="search-field"><label for="doctor-search">Buscar especialista</label><input id="doctor-search" type="search" placeholder="Buscar médico o especialidad" autocomplete="off"></div><div class="filter-field"><label for="doctor-specialty">Especialidad</label><select id="doctor-specialty"><option value="">Todas las especialidades</option>${specialtyOptions.map((name) => `<option value="${escapeHtml(name.toLowerCase())}">${escapeHtml(name)}</option>`).join('')}</select></div></section><div class="directory-summary"><h2>Profesionales disponibles</h2><span id="doctor-count">${doctors.length} especialistas</span></div><div class="grid doctors-grid" id="doctor-grid">${doctors.map((doctor) => { const specialty = specialtyNames.get(doctor.specialty_id) || 'Medicina'; return `<article class="doctor-card" data-search="${escapeHtml(`${doctor.full_name} ${specialty}`.toLowerCase())}" data-specialty="${escapeHtml(specialty.toLowerCase())}"><div class="doctor-picture">${doctorPhoto(doctor)}</div><div class="doctor-info"><span class="specialty-badge">${escapeHtml(specialty)}</span><h3>${escapeHtml(doctor.full_name)}</h3><p class="doctor-schedule">${escapeHtml(doctor.schedule_description || 'Horario sujeto a disponibilidad')}</p><div class="doctor-bottom"><div><span class="price-label">Valor de consulta</span><strong>${formatPrice(doctor.consultation_price)}</strong></div><button class="button small" data-doctor="${doctor.id}">Ver disponibilidad</button></div></div></article>`; }).join('') || '<div class="empty">No hay médicos disponibles.</div>'}</div><p class="image-disclaimer">Imágenes de profesionales ilustrativas. El nombre, la especialidad, el horario y el precio se consultan desde MediCita.</p>`;
  const searchField = document.getElementById('doctor-search');
  const specialtyFilter = document.getElementById('doctor-specialty');
  const updateDoctorFilters = () => {
    const query = searchField.value.trim().toLocaleLowerCase('es');
    const specialty = specialtyFilter.value;
    let count = 0;
    document.querySelectorAll('#doctor-grid .doctor-card').forEach((card) => {
      const isVisible = card.dataset.search.includes(query) && (!specialty || card.dataset.specialty === specialty);
      card.hidden = !isVisible;
      if (isVisible) count += 1;
    });
    document.getElementById('doctor-count').textContent = `${count} especialistas`;
  };
  searchField.addEventListener('input', updateDoctorFilters);
  specialtyFilter.addEventListener('change', updateDoctorFilters);
  document.querySelectorAll('[data-doctor]').forEach((button) => button.onclick = () => { session.doctorId = Number(button.dataset.doctor); navigate('book'); });
}

function getDoctorPortrait(doctor) {
  const specialtyId = Number(doctor.specialty_id);
  const doctorId = Number(doctor.id);
  const portraitIndex = Number.isInteger(specialtyId) && specialtyId > 0
    ? (specialtyId - 1) % 6
    : Number.isInteger(doctorId) && doctorId > 0 ? (doctorId - 1) % 6 : 0;
  return `/assets/doctors/portrait-${portraitIndex + 1}.webp`;
}

function doctorPhoto(doctor, className = 'doctor-photo') {
  return `<img class="${className}" src="${getDoctorPortrait(doctor)}" alt="Retrato ilustrativo de especialista" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/doctors/default.svg'">`;
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

async function renderBooking() {
  const doctors = await request('/doctors');
  if (!doctors.length) { document.getElementById('screen-content').innerHTML = '<div class="empty">No hay especialistas disponibles.</div>'; return; }
  if (!doctors.some((doctor) => doctor.id === session.doctorId)) session.doctorId = doctors[0].id;
  document.getElementById('screen-content').innerHTML = `<section class="hero"><span class="badge">Reserva en tiempo real · Paso 1 de 2</span><h1>Agendar hora médica</h1><p>Selecciona al especialista y consulta los horarios disponibles.</p></section><section class="panel"><form id="booking-form"><div class="form-grid"><div><label for="booking-doctor">Especialista</label><select id="booking-doctor">${doctors.map((doctor) => `<option value="${doctor.id}" ${doctor.id === session.doctorId ? 'selected' : ''}>${escapeHtml(doctor.full_name)}</option>`).join('')}</select></div><div><label for="booking-date">Fecha de consulta</label><input type="date" id="booking-date" required min="${new Date().toLocaleDateString('en-CA')}"></div></div><div id="booking-doctor-preview" class="booking-preview"></div><h3>Horarios disponibles</h3><div id="availability" class="empty">Selecciona una fecha para consultar los horarios reales.</div><button type="submit" class="button" id="booking-submit" disabled>Confirmar cita</button></form></section>`;
  document.getElementById('booking-date').value = new Date().toLocaleDateString('en-CA');
  const updateBookingPreview = () => { const selectedDoctor = doctors.find((doctor) => doctor.id === session.doctorId); document.getElementById('booking-doctor-preview').innerHTML = selectedDoctor ? `${doctorPhoto(selectedDoctor, 'booking-photo')}<div><span class="price-label">Especialista seleccionado</span><strong>${escapeHtml(selectedDoctor.full_name)}</strong><p class="muted">${escapeHtml(selectedDoctor.schedule_description || 'Consulta médica')}</p></div>` : ''; };
  updateBookingPreview();
  document.getElementById('booking-doctor').onchange = async (event) => { session.doctorId = Number(event.target.value); updateBookingPreview(); await loadSlots(); };
  document.getElementById('booking-date').onchange = loadSlots;
  document.getElementById('booking-form').onsubmit = submitBooking;
  await loadSlots();
}

async function loadSlots() {
  const date = document.getElementById('booking-date').value;
  const target = document.getElementById('availability');
  const button = document.getElementById('booking-submit');
  session.slot = null;
  button.disabled = true;
  target.className = 'loading';
  target.innerHTML = '<span class="spinner"></span> Consultando disponibilidad...';
  if (!date) return;
  try {
    const availability = await request(`/doctors/${session.doctorId}/availability?date=${encodeURIComponent(date)}`);
    const slots = availability.slots || [];
    target.className = 'slot-list';
    target.innerHTML = slots.length ? slots.map((slot, index) => `<button type="button" class="slot" data-slot="${index}">${escapeHtml(displaySlot(slot, date))}</button>`).join('') : '<div class="empty">No hay cupos disponibles para esta fecha.</div>';
    target.querySelectorAll('[data-slot]').forEach((item) => item.onclick = () => { session.slot = slots[Number(item.dataset.slot)]; target.querySelectorAll('.slot').forEach((slotButton) => slotButton.classList.remove('selected')); item.classList.add('selected'); button.disabled = false; });
  } catch (error) { target.className = 'empty'; target.textContent = error.message; notify(error.message, true); }
}

function normalizeSlot(slot, date) {
  const value = typeof slot === 'string' ? slot : (slot.starts_at || slot.start || slot.time);
  if (!value) throw new Error('El horario seleccionado no es válido');
  const normalized = /^\d{2}:\d{2}/.test(value) ? `${date}T${value}` : value.replace(' ', 'T');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/);
  if (!match) throw new Error('Formato de fecha y hora no válido');
  return match[1];
}

function displaySlot(slot, date) {
  const value = normalizeSlot(slot, date);
  const [hour, minute] = value.slice(11, 16).split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
}

function statusLabel(status) {
  return { scheduled: 'Programada', cancelled: 'Cancelada', completed: 'Completada' }[status] || status;
}

async function submitBooking(event) {
  event.preventDefault();
  if (!session.slot) return;
  const button = document.getElementById('booking-submit');
  button.disabled = true;
  button.textContent = 'Confirmando...';
  try {
    await request('/appointments', { method: 'POST', body: JSON.stringify({ patient_id: session.user.patient_id, doctor_id: session.doctorId, starts_at: normalizeSlot(session.slot, document.getElementById('booking-date').value), duration_minutes: 30 }) });
    notify('Cita reservada correctamente');
    await navigate('appointments');
  } catch (error) { handleError(error); button.disabled = false; button.textContent = 'Confirmar cita'; }
}

async function renderAppointments() {
  const [appointments, doctors] = await Promise.all([request('/appointments'), request('/doctors')]);
  const names = new Map(doctors.map((doctor) => [doctor.id, doctor.full_name]));
  const rows = appointments.map((item) => {
    const editable = item.status === 'scheduled' && new Date(item.starts_at).getTime() > Date.now();
    return `<tr><td>${formatDate(item.starts_at)}</td><td>${escapeHtml(names.get(item.doctor_id) || `Médico #${item.doctor_id}`)}</td><td><span class="pill ${item.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(statusLabel(item.status))}</span></td><td>${formatPrice(item.price_at_booking)}</td><td>${item.status === 'completed' ? `<button class="button secondary small" data-review-appointment="${item.id}">Dejar reseña</button>` : editable ? `<div class="appointment-actions"><button type="button" class="button secondary small" data-reschedule="${item.id}">Reprogramar</button><button type="button" class="button danger small" data-cancel="${item.id}">Cancelar</button></div>` : '—'}</td></tr>`;
  });
  document.getElementById('screen-content').innerHTML = `<section class="hero"><span class="badge">Portal del paciente</span><h1>Mis consultas y evaluaciones clínicas</h1><p>Revisa y administra las citas registradas en tu cuenta.</p></section><section class="panel"><div class="toolbar"><h2>Historial de citas</h2><button id="new-appointment" class="button small">Nueva cita</button></div>${appointments.length ? `<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Especialista</th><th>Estado</th><th>Importe</th><th>Acciones</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<div class="empty">Todavía no hay citas registradas.</div>'}</section><section class="panel" id="reschedule-panel" hidden></section>`;
  document.getElementById('new-appointment').onclick = () => navigate('book');
  document.querySelectorAll('[data-review-appointment]').forEach((button) => button.onclick = () => navigate('reviews'));
  document.querySelectorAll('[data-cancel]').forEach((button) => button.onclick = async () => {
    if (!window.confirm('¿Deseas cancelar esta cita?')) return;
    button.disabled = true;
    button.textContent = 'Cancelando...';
    try {
      await request(`/appointments/${button.dataset.cancel}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
      notify('Cita cancelada correctamente');
      await renderAppointments();
    } catch (error) { handleError(error); button.disabled = false; button.textContent = 'Cancelar'; }
  });
  document.querySelectorAll('[data-reschedule]').forEach((button) => button.onclick = () => {
    const item = appointments.find((appointment) => appointment.id === Number(button.dataset.reschedule));
    showRescheduleForm(item, names.get(item.doctor_id)).catch(handleError);
  });
}

async function showRescheduleForm(appointment, doctorName) {
  const target = document.getElementById('reschedule-panel');
  target.hidden = false;
  const minDate = new Date().toLocaleDateString('en-CA');
  target.innerHTML = `<h2>Reprogramar cita</h2><p class="muted">${escapeHtml(doctorName || 'Especialista')} · Cita #${appointment.id}</p><form id="reschedule-form"><label for="reschedule-date">Nueva fecha</label><input id="reschedule-date" type="date" required min="${minDate}"><h3>Horarios disponibles</h3><div id="reschedule-slots" class="empty">Selecciona una fecha.</div><div class="appointment-actions"><button id="reschedule-submit" class="button" type="submit" disabled>Guardar nueva fecha</button><button type="button" id="reschedule-close" class="button secondary">Cerrar</button></div></form>`;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('reschedule-close').onclick = () => { target.hidden = true; };
  let selectedSlot = null;
  document.getElementById('reschedule-date').onchange = async (event) => {
    const date = event.target.value;
    selectedSlot = null;
    document.getElementById('reschedule-submit').disabled = true;
    const slotsTarget = document.getElementById('reschedule-slots');
    slotsTarget.className = 'loading';
    slotsTarget.innerHTML = '<span class="spinner"></span> Consultando disponibilidad...';
    try {
      const availability = await request(`/doctors/${appointment.doctor_id}/availability?date=${encodeURIComponent(date)}`);
      const slots = availability.slots || [];
      slotsTarget.className = slots.length ? 'slot-list' : 'empty';
      slotsTarget.innerHTML = slots.length ? slots.map((slot, index) => `<button type="button" class="slot" data-new-slot="${index}">${escapeHtml(displaySlot(slot, date))}</button>`).join('') : 'No hay cupos para esta fecha.';
      slotsTarget.querySelectorAll('[data-new-slot]').forEach((button) => button.onclick = () => {
        selectedSlot = slots[Number(button.dataset.newSlot)];
        slotsTarget.querySelectorAll('.slot').forEach((element) => element.classList.remove('selected'));
        button.classList.add('selected');
        document.getElementById('reschedule-submit').disabled = false;
      });
    } catch (error) { slotsTarget.className = 'empty'; slotsTarget.textContent = error.message; handleError(error); }
  };
  document.getElementById('reschedule-form').onsubmit = async (event) => {
    event.preventDefault();
    if (!selectedSlot) return;
    const button = document.getElementById('reschedule-submit');
    button.disabled = true;
    button.textContent = 'Guardando...';
    try {
      await request(`/appointments/${appointment.id}`, { method: 'PATCH', body: JSON.stringify({ starts_at: normalizeSlot(selectedSlot, document.getElementById('reschedule-date').value) }) });
      notify('Cita reprogramada correctamente');
      await renderAppointments();
    } catch (error) { handleError(error); button.disabled = false; button.textContent = 'Guardar nueva fecha'; }
  };
}

const RESULT_TYPE_LABELS = Object.freeze({
  numeric: 'Numérico', qualitative: 'Cualitativo', imaging: 'Imagenología'
});

function formatResultType(value) {
  return RESULT_TYPE_LABELS[value] || 'Otro tipo de examen';
}

function renderResultDetail(result) {
  const detail = result.detail;
  const overview = `<div class="result-overview">
    <div><span class="result-label">Tipo de examen</span><strong>${escapeHtml(formatResultType(result.result_type))}</strong></div>
    <div><span class="result-label">Fecha de registro</span><strong>${escapeHtml(formatDate(result.created_at))}</strong></div>
  </div>`;
  let content = '<div class="result-notice" role="status">El examen está registrado, pero su detalle todavía no está disponible.</div>';

  if (detail && result.result_type === 'numeric') {
    const value = Number(detail.measured_value);
    const min = Number(detail.reference_min);
    const max = Number(detail.reference_max);
    const unit = escapeHtml(detail.unit);
    const valid = [value, min, max].every(Number.isFinite);
    content = valid
      ? `<div class="result-measurement"><span class="result-label">Valor registrado</span>
          <div class="result-value">${escapeHtml(value)} <span>${unit}</span></div></div>
         <div class="result-reference"><span class="result-label">Rango de referencia registrado</span>
          <strong>${escapeHtml(min)} – ${escapeHtml(max)} ${unit}</strong></div>`
      : '<div class="result-notice">Los valores de este examen no están completos.</div>';
  } else if (detail && result.result_type === 'qualitative') {
    content = `<div class="result-reference"><span class="result-label">Hallazgo registrado</span>
      <p class="result-report">${escapeHtml(detail.finding || 'Sin hallazgo registrado')}</p></div>`;
  } else if (detail && result.result_type === 'imaging') {
    content = `<div class="result-reference"><span class="result-label">Informe de imagenología</span>
      <p class="result-report">${escapeHtml(detail.report_text || 'No hay informe disponible')}</p>${detail.image_path ? `<button type="button" class="button secondary small" data-result-image="${Number(result.id)}">Ver imagen o informe adjunto</button>` : ''}<div id="imaging-attachment"></div></div>`;
  }

  return `<div class="result-heading"><span class="badge">Resultado de laboratorio</span>
      <h2>${escapeHtml(result.exam_name || 'Resultado médico')}</h2></div>
    ${overview}<div class="result-detail-content">${content}</div>
    <p class="result-disclaimer">Estos datos provienen del expediente registrado. La interpretación clínica corresponde al profesional tratante.</p>`;
}

async function renderResults() {
  const results = await request('/medical-results');
  document.getElementById('screen-content').innerHTML = `<section class="hero"><span class="badge">Expediente de resultados</span><h1>Resultados de exámenes</h1><p>Consulta los resultados médicos disponibles para tu cuenta.</p></section><section class="panel"><h2>Resultados registrados</h2>${results.length ? `<div class="table-scroll"><table><thead><tr><th>Examen</th><th>Tipo</th><th>Fecha</th><th>Detalle</th></tr></thead><tbody>${results.map((item) => `<tr><td>${escapeHtml(item.exam_name)}</td><td>${escapeHtml(formatResultType(item.result_type))}</td><td>${formatDate(item.created_at)}</td><td><button class="button secondary small" data-result="${item.id}">Consultar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No hay resultados disponibles.</div>'}</section><section class="panel" id="result-detail" hidden></section>`;
  document.querySelectorAll('[data-result]').forEach((button) => button.onclick = async () => {
    const target = document.getElementById('result-detail');
    target.hidden = false;
    target.innerHTML = '<div class="loading"><span class="spinner"></span> Consultando resultado...</div>';
    try {
      const result = await request(`/medical-results/${button.dataset.result}`);
      target.innerHTML = renderResultDetail(result);
      const attachmentButton = target.querySelector('[data-result-image]');
      if (attachmentButton) attachmentButton.onclick = () => loadProtectedImage(result.id, attachmentButton);
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) { target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; handleError(error); }
  });
}

async function loadProtectedImage(resultId, button) {
  button.disabled = true;
  button.textContent = 'Descargando archivo...';
  try {
    const response = await fetch(`/api/medical-results/${resultId}/image`, {
      headers: { authorization: `Bearer ${session.token}` }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'No se pudo abrir el archivo del examen');
    }
    const file = await response.blob();
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowed.includes(file.type)) throw new Error('Formato de archivo no admitido');
    const url = URL.createObjectURL(file);
    const viewer = document.getElementById('imaging-attachment');
    viewer.innerHTML = file.type === 'application/pdf'
      ? '<p>Se abrió el informe PDF en otra pestaña.</p>'
      : '<img class="imaging-preview" alt="Imagen adjunta del estudio médico">';
    if (file.type === 'application/pdf') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      viewer.querySelector('img').src = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { handleError(error); }
  finally { button.disabled = false; button.textContent = 'Ver imagen o informe adjunto'; }
}

async function renderReviews() {
  const [appointments, reviews, doctors, tags] = await Promise.all([
    request('/appointments'), request('/reviews'), request('/doctors'), request('/review-tags')
  ]);
  const doctorNames = new Map(doctors.map((doctor) => [Number(doctor.id), doctor.full_name]));
  const reviewed = new Set(reviews.map((item) => Number(item.appointment_id)));
  const eligible = appointments.filter((item) => item.status === 'completed' && !reviewed.has(Number(item.id)));
  const options = eligible.map((item) => `<option value="${item.id}">${escapeHtml(doctorNames.get(Number(item.doctor_id)) || `Médico #${item.doctor_id}`)} · ${escapeHtml(formatDate(item.starts_at))}</option>`).join('');
  const history = reviews.length ? reviews.map((item) => `<div class="review-item"><strong>${escapeHtml(doctorNames.get(Number(item.doctor_id)) || `Médico #${item.doctor_id}`)}</strong><span class="pill">${escapeHtml(item.rating)}/5</span><p>${escapeHtml(item.comment || 'Sin comentario')}</p>${item.wait_minutes == null ? '' : `<small>Tiempo de espera: ${escapeHtml(item.wait_minutes)} minutos</small>`}</div>`).join('') : '<div class="empty">Aún no has publicado reseñas.</div>';
  document.getElementById('screen-content').innerHTML = `<section class="hero"><span class="badge">Opiniones verificadas</span><h1>Mis reseñas médicas</h1><p>Califica a tus especialistas después de una cita atendida.</p></section>
    <section class="panel"><h2>Escribir una reseña</h2>${!eligible.length ? '<div class="empty">No hay citas atendidas pendientes de reseñar. El administrador debe marcarlas como Completadas.</div>' : `<form id="review-form"><label for="review-appointment">Cita atendida</label><select id="review-appointment" required>${options}</select><div class="form-grid"><div><label for="review-rating">Calificación</label><select id="review-rating" required><option value="5">5 — Excelente</option><option value="4">4 — Muy buena</option><option value="3">3 — Buena</option><option value="2">2 — Regular</option><option value="1">1 — Mala</option></select></div><div><label for="review-wait">Tiempo de espera en minutos (opcional)</label><input id="review-wait" type="number" min="0" step="1" placeholder="Ej.: 15"></div></div><label for="review-comment">Comentario (opcional)</label><textarea id="review-comment" maxlength="2000" placeholder="Cuéntanos tu experiencia"></textarea><fieldset class="tag-fieldset"><legend>Etiquetas (opcional)</legend>${tags.length ? tags.map((tag) => `<label class="tag-option"><input type="checkbox" name="review-tag" value="${tag.id}">${escapeHtml(tag.name)}</label>`).join('') : '<p class="muted">Todavía no hay etiquetas registradas.</p>'}</fieldset><button class="button" type="submit" id="review-submit">Publicar reseña</button></form>`}</section><section class="panel"><h2>Reseñas registradas</h2>${history}</section>`;
  const form = document.getElementById('review-form');
  if (!form) return;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const submit = document.getElementById('review-submit');
    submit.disabled = true;
    submit.textContent = 'Publicando...';
    try {
      const waitText = document.getElementById('review-wait').value;
      const created = await request('/reviews', { method: 'POST', body: JSON.stringify({
        appointment_id: Number(document.getElementById('review-appointment').value),
        rating: Number(document.getElementById('review-rating').value),
        comment: document.getElementById('review-comment').value.trim() || null,
        wait_minutes: waitText === '' ? null : Number(waitText)
      }) });
      const tagIds = [...document.querySelectorAll('input[name="review-tag"]:checked')].map((input) => Number(input.value));
      if (tagIds.length) await request(`/reviews/${created.id}/tags`, { method: 'PUT', body: JSON.stringify({ tags: tagIds }) });
      notify('Reseña registrada correctamente');
      await renderReviews();
    } catch (error) { handleError(error); submit.disabled = false; submit.textContent = 'Publicar reseña'; }
  };
}

async function exportFinanceCsv(report) {
  const columns = ['id', 'patient_id', 'patient_name', 'doctor_id', 'doctor_name', 'starts_at', 'status', 'price_at_booking'];
  const safeCell = (value) => {
    const content = String(value ?? '');
    const escaped = /^[=+@\-\t\r]/.test(content) ? `'${content}` : content;
    return `"${escaped.replace(/"/g, '""')}"`;
  };
  const lines = [columns.join(','), ...report.appointments.map((item) => columns.map((key) => safeCell(item[key])).join(','))];
  const blob = new Blob([String.fromCharCode(0xFEFF) + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `medicita-reporte-${report.from || 'inicio'}-${report.to || 'hoy'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function renderFinance() {
  const content = document.getElementById('screen-content');
  content.innerHTML = `<section class="hero admin-hero"><span class="badge">Administración · Reportes</span><h1>Valor de citas y reportes</h1><p>Los importes corresponden a citas registradas; no constituyen confirmación de pagos recibidos.</p></section><section class="panel"><div class="toolbar"><h2>Filtrar por fecha</h2><button type="button" class="button secondary small" id="finance-export" disabled>Exportar CSV</button></div><form id="finance-form" class="form-grid"><div><label for="finance-from">Desde (opcional)</label><input id="finance-from" type="date"></div><div><label for="finance-to">Hasta (opcional)</label><input id="finance-to" type="date"></div><div class="full"><button class="button" type="submit">Consultar reporte</button></div></form></section><section class="panel" id="finance-content"></section>`;
  const form = document.getElementById('finance-form');
  const load = async () => {
    const from = document.getElementById('finance-from').value;
    const to = document.getElementById('finance-to').value;
    if (from && to && from > to) return notify('La fecha inicial debe ser anterior o igual a la final', true);
    const target = document.getElementById('finance-content');
    target.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando reporte...</div>';
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const report = await request(`/admin/finance${params.size ? `?${params.toString()}` : ''}`);
      const summary = report.summary;
      target.innerHTML = `<h2>Resumen financiero</h2><div class="finance-grid"><div class="admin-metric"><span>Valor de citas atendidas</span><strong>${formatPrice(summary.completed.value)}</strong><small>${summary.completed.count} citas</small></div><div class="admin-metric"><span>Valor de citas programadas</span><strong>${formatPrice(summary.scheduled.value)}</strong><small>${summary.scheduled.count} citas</small></div><div class="admin-metric"><span>Valor de citas canceladas</span><strong>${formatPrice(summary.cancelled.value)}</strong><small>${summary.cancelled.count} citas</small></div><div class="admin-metric"><span>Total de citas</span><strong>${report.appointments.length}</strong><small>Todos los estados</small></div></div><p class="result-disclaimer">El sistema no registra pagos ni recaudo efectivo. Los importes representan el valor de las citas según su estado y precio pactado al reservar.</p><h3>Detalle de citas</h3><div class="table-scroll"><table><thead><tr><th>ID</th><th>Paciente</th><th>Médico</th><th>Fecha</th><th>Estado</th><th>Importe</th></tr></thead><tbody>${report.appointments.map((item) => `<tr><td>${item.id}</td><td>${escapeHtml(item.patient_name)}</td><td>${escapeHtml(item.doctor_name)}</td><td>${escapeHtml(formatDate(item.starts_at))}</td><td>${escapeHtml(statusLabel(item.status))}</td><td>${formatPrice(item.price_at_booking)}</td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('finance-export').disabled = false;
      document.getElementById('finance-export').onclick = () => exportFinanceCsv(report);
    } catch (error) { handleError(error); target.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
  };
  form.onsubmit = (event) => { event.preventDefault(); load(); };
  await load();
}

async function renderDailyAppointments() {
  const data = await request('/admin/appointments-today');
  const content = document.getElementById('screen-content');
  content.innerHTML = `<section class="hero admin-hero"><span class="badge">Gestión clínica</span><h1>Citas del día</h1><p>Reservas registradas para la fecha del servidor, con sus pacientes, especialistas y estados.</p></section><section class="panel"><h2>Agenda del día: ${escapeHtml(data.date)}</h2>${data.appointments.length ? `<div class="table-scroll"><table><thead><tr><th>Hora</th><th>Paciente</th><th>Médico</th><th>Estado</th><th>Valor</th></tr></thead><tbody>${data.appointments.map((item) => `<tr><td>${escapeHtml(formatDate(item.starts_at))}</td><td>${escapeHtml(item.patient_name)}</td><td>${escapeHtml(item.doctor_name)}</td><td>${escapeHtml(statusLabel(item.status))}</td><td>${formatPrice(item.price_at_booking)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No hay citas para hoy.</div>'}</section><section class="panel"><button class="button secondary" id="daily-back">Volver a gestión</button></section>`;
  document.getElementById('daily-back').onclick = () => renderAdmin().catch(handleError);
}

const adminResources = {
  doctors: {
    label: 'Especialistas', route: 'doctors',
    fields: [
      { key: 'full_name', label: 'Nombre completo', type: 'text' },
      { key: 'specialty_id', label: 'Especialidad', type: 'specialty' },
      { key: 'schedule_description', label: 'Descripción de horario', type: 'text' },
      { key: 'consultation_price', label: 'Valor de consulta', type: 'number' },
      { key: 'profile', label: 'Perfil profesional', type: 'textarea', optional: true },
      { key: 'active', label: 'Estado', type: 'active' }
    ],
    columns: ['id', 'full_name', 'specialty_name', 'consultation_price', 'active']
  },
  specialties: {
    label: 'Especialidades', route: 'specialties',
    fields: [{ key: 'name', label: 'Nombre de especialidad', type: 'text' }],
    columns: ['id', 'name']
  },
  'doctor-schedules': {
    label: 'Horarios médicos', route: 'doctor-schedules',
    fields: [
      { key: 'doctor_id', label: 'Identificador de médico', type: 'number' },
      { key: 'weekday', label: 'Día de la semana', type: 'weekday' },
      { key: 'start_time', label: 'Hora de inicio', type: 'time' },
      { key: 'end_time', label: 'Hora de finalización', type: 'time' }
    ],
    columns: ['id', 'doctor_id', 'weekday', 'start_time', 'end_time']
  },
  patients: {
    label: 'Pacientes', route: 'patients',
    fields: [
      { key: 'full_name', label: 'Nombre completo', type: 'text' },
      { key: 'email', label: 'Correo electrónico', type: 'email' },
      { key: 'phone', label: 'Teléfono', type: 'text', optional: true }
    ],
    columns: ['id', 'full_name', 'email', 'phone']
  },
  appointments: {
    label: 'Citas médicas', route: 'appointments', updateOnly: true,
    fields: [{ key: 'status', label: 'Estado de la cita', type: 'status' }],
    columns: ['id', 'patient_id', 'doctor_id', 'starts_at', 'status']
  },
  users: {
    label: 'Cuentas y roles', route: 'users', readOnly: true, fields: [],
    columns: ['id', 'patient_id', 'email', 'role']
  }
};

const adminColumnLabels = {
  id: 'ID', full_name: 'Nombre', specialty_name: 'Especialidad',
  consultation_price: 'Tarifa', active: 'Activo', name: 'Nombre', doctor_id: 'Médico',
  weekday: 'Día', start_time: 'Inicio', end_time: 'Fin', email: 'Correo',
  phone: 'Teléfono', patient_id: 'Paciente', starts_at: 'Fecha y hora',
  status: 'Estado', role: 'Rol'
};

function adminFieldMarkup(field, specialties) {
  const elementId = `field-${field.key}`;
  const required = field.optional ? '' : 'required';
  if (field.type === 'specialty') {
    return `<select id="${elementId}" ${required}><option value="">Seleccionar especialidad</option>${specialties.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}</select>`;
  }
  if (field.type === 'active') {
    return `<select id="${elementId}"><option value="1">Activo</option><option value="0">Inactivo</option></select>`;
  }
  if (field.type === 'status') {
    return `<select id="${elementId}"><option value="scheduled">Programada</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option></select>`;
  }
  if (field.type === 'weekday') {
    return `<select id="${elementId}">${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((name, index) => `<option value="${index}">${name}</option>`).join('')}</select>`;
  }
  if (field.type === 'textarea') return `<textarea id="${elementId}" ${required}></textarea>`;
  const constraints = field.type === 'number' ? 'min="0" step="any"' : '';
  return `<input id="${elementId}" type="${field.type}" ${required} ${constraints}>`;
}

function adminDisplayValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'status') return ({ scheduled: 'Programada', completed: 'Completada', cancelled: 'Cancelada' })[value] || String(value);
  if (key === 'active') return Number(value) ? 'Sí' : 'No';
  if (key === 'weekday') return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][Number(value)] || String(value);
  if (key === 'consultation_price') return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value));
  if (key === 'starts_at') return formatDate(value);
  return String(value);
}

function adminFormData(fields) {
  return Object.fromEntries(fields.map((field) => {
    const input = document.getElementById(`field-${field.key}`);
    const value = input.value;
    if (field.optional && value === '') return [field.key, null];
    if (['number', 'active', 'weekday', 'specialty'].includes(field.type)) return [field.key, Number(value)];
    return [field.key, value];
  }));
}

async function renderAdmin(resource = 'doctors') {
  if (session.user?.role !== 'admin') return navigate('home');
  const definition = adminResources[resource];
  if (!definition) throw new Error('Sección administrativa inválida');
  const [data, specialties] = await Promise.all([
    request(`/${definition.route}`),
    resource === 'doctors' ? request('/specialties') : Promise.resolve([])
  ]);
  const columns = definition.columns;
  const actionsHeader = definition.readOnly ? '' : '<th>Acciones</th>';
  const rows = data.map((item) => `<tr>${columns.map((key) => `<td>${escapeHtml(adminDisplayValue(key, item[key]))}</td>`).join('')}${definition.readOnly ? '' : `<td><div class="admin-actions"><button type="button" class="button secondary small" data-edit="${item.id}">Editar</button>${definition.updateOnly ? '' : `<button type="button" class="button danger small" data-delete="${item.id}">Eliminar</button>`}</div></td>`}</tr>`).join('');
  const formHeading = definition.updateOnly ? 'Actualizar estado de una cita' : `Registrar ${definition.label.toLowerCase()}`;
  const formSection = definition.readOnly
    ? '<section class="panel"><p class="muted">Las credenciales de usuario no se administran desde esta sección. No se muestran contraseñas ni hashes.</p></section>'
    : `<section class="panel admin-editor" id="admin-editor"><div class="toolbar"><h2 id="admin-form-title">${formHeading}</h2><button type="button" class="button secondary small" id="admin-clear">Limpiar formulario</button></div><form id="admin-form"><input type="hidden" id="record-id"><div class="form-grid">${definition.fields.map((field) => `<div><label for="field-${field.key}">${field.label}</label>${adminFieldMarkup(field, specialties)}</div>`).join('')}</div><div class="admin-form-buttons"><button class="button" id="admin-save" type="submit">${definition.updateOnly ? 'Actualizar cita' : 'Guardar registro'}</button></div></form></section>`;
  document.getElementById('screen-content').innerHTML = `<section class="hero admin-hero"><span class="badge">Acceso exclusivo para administradores</span><h1>Panel de gestión MediCita</h1><p>Gestiona especialistas, especialidades, horarios, pacientes y citas mediante la API REST.</p><div class="admin-shortcuts"><button type="button" class="button" id="finance-open">Reporte financiero</button><button type="button" class="button secondary" id="daily-open">Citas del día</button></div></section><section class="panel"><div class="toolbar"><div><h2>Administración de registros</h2><p class="muted">Selecciona el módulo que deseas gestionar.</p></div><label for="admin-resource" class="admin-resource-label">Módulo<select id="admin-resource">${Object.entries(adminResources).map(([key, item]) => `<option value="${key}" ${key === resource ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label></div><div class="admin-metrics"><div class="admin-metric"><strong>${data.length}</strong><span>Registros en ${escapeHtml(definition.label.toLowerCase())}</span></div><div class="admin-metric"><strong>${escapeHtml(session.user.email || 'Administrador')}</strong><span>Sesión con rol administrativo</span></div></div></section><section class="panel"><div class="toolbar"><h2>${definition.label}</h2><span class="badge">Datos de la API</span></div><div class="table-scroll"><table><thead><tr>${columns.map((key) => `<th>${escapeHtml(adminColumnLabels[key] || key)}</th>`).join('')}${actionsHeader}</tr></thead><tbody>${rows}</tbody></table></div>${!data.length ? '<div class="empty">No hay registros para mostrar.</div>' : ''}</section>${formSection}`;
  document.getElementById('finance-open').onclick = () => renderFinance().catch(handleError);
  document.getElementById('daily-open').onclick = () => renderDailyAppointments().catch(handleError);
  document.getElementById('admin-resource').onchange = (event) => {
    setLoading('Cargando módulo administrativo...');
    renderAdmin(event.target.value).catch(handleError);
  };
  if (definition.readOnly) return;
  document.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => {
    const item = data.find((record) => Number(record.id) === Number(button.dataset.edit));
    if (!item) return notify('No se encontró el registro', true);
    document.getElementById('record-id').value = item.id;
    definition.fields.forEach((field) => {
      document.getElementById(`field-${field.key}`).value = field.type === 'time' ? String(item[field.key] ?? '').slice(0, 5) : (item[field.key] ?? '');
    });
    document.getElementById('admin-form-title').textContent = `Editar registro #${item.id}`;
    document.getElementById('admin-editor').scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelectorAll('[data-delete]').forEach((button) => button.onclick = async () => {
    if (!window.confirm('¿Eliminar este registro definitivamente? No se puede deshacer.')) return;
    button.disabled = true;
    try {
      await request(`/${definition.route}/${button.dataset.delete}`, { method: 'DELETE' });
      notify('Registro eliminado correctamente');
      await renderAdmin(resource);
    } catch (error) { handleError(error); button.disabled = false; }
  });
  document.getElementById('admin-clear').onclick = () => {
    document.getElementById('admin-form').reset();
    document.getElementById('record-id').value = '';
    document.getElementById('admin-form-title').textContent = formHeading;
  };
  document.getElementById('admin-form').onsubmit = async (event) => {
    event.preventDefault();
    const recordId = document.getElementById('record-id').value;
    if (definition.updateOnly && !recordId) return notify('Primero selecciona una cita para editar', true);
    const payload = adminFormData(definition.fields);
    const submit = document.getElementById('admin-save');
    submit.disabled = true;
    submit.textContent = 'Guardando...';
    try {
      await request(`/${definition.route}${recordId ? `/${recordId}` : ''}`, {
        method: recordId ? 'PATCH' : 'POST', body: JSON.stringify(payload)
      });
      notify('Cambios guardados correctamente');
      await renderAdmin(resource);
    } catch (error) {
      handleError(error);
      submit.disabled = false;
      submit.textContent = definition.updateOnly ? 'Actualizar cita' : 'Guardar registro';
    }
  };
}

renderAuth();
