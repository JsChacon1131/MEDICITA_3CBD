const pool = require('../config/database');

async function findByEmail(email) {
  const [users] = await pool.query(
    'SELECT id, patient_id, email, role, password FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return users[0] || null;
}

module.exports = { findByEmail };
