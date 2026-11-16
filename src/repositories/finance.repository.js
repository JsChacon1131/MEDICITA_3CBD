const pool = require('../config/database');

async function listAppointments(from, to) {
  const conditions = [];
  const values = [];
  if (from) { conditions.push('DATE(a.starts_at) >= ?'); values.push(from); }
  if (to) { conditions.push('DATE(a.starts_at) <= ?'); values.push(to); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, p.full_name AS patient_name,
            a.doctor_id, d.full_name AS doctor_name, a.starts_at,
            a.status, a.price_at_booking
     FROM appointments a
     INNER JOIN patients p ON p.id = a.patient_id
     INNER JOIN doctors d ON d.id = a.doctor_id
     ${where}
     ORDER BY a.starts_at DESC, a.id DESC`, values
  );
  return rows;
}

async function listToday() {
  const [dates] = await pool.query('SELECT CURRENT_DATE() AS today');
  const date = String(dates[0].today instanceof Date ? dates[0].today.toISOString().slice(0, 10) : dates[0].today).slice(0, 10);
  const appointments = await listAppointments(date, date);
  return { date, appointments };
}

module.exports = { listAppointments, listToday };
