require('dotenv').config();
const pool = require('../src/config/database');
const { isPasswordHash } = require('../src/utils/password');

async function auditPasswords() {
  try {
    const [users] = await pool.query('SELECT id, password FROM users');
    const counts = { hashed: 0, legacy: 0, invalid: 0 };
    for (const user of users) {
      if (isPasswordHash(user.password)) counts.hashed += 1;
      else if (typeof user.password === 'string' && user.password.length > 0 && !user.password.startsWith('scrypt$')) counts.legacy += 1;
      else counts.invalid += 1;
    }
    process.stdout.write(`Usuarios revisados: ${users.length}\n`);
    process.stdout.write(`Contraseñas seguras: ${counts.hashed}\n`);
    process.stdout.write(`Contraseñas antiguas pendientes: ${counts.legacy}\n`);
    process.stdout.write(`Credenciales inválidas o no reconocidas: ${counts.invalid}\n`);
    if (counts.invalid > 0 || counts.legacy > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

auditPasswords().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
