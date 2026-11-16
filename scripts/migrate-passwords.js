require('dotenv').config();
const pool = require('../src/config/database');
const { hashPassword, isPasswordHash } = require('../src/utils/password');

async function main() {
  if (process.env.CONFIRM_PASSWORD_MIGRATION !== 'YES') {
    throw new Error('Establezca CONFIRM_PASSWORD_MIGRATION=YES después de realizar un respaldo de la base de datos');
  }
  const connection = await pool.getConnection();
  let migrated = 0;
  try {
    await connection.beginTransaction();
    const [users] = await connection.query('SELECT id, password FROM users FOR UPDATE');
    for (const user of users) {
      if (isPasswordHash(user.password)) continue;
      if (typeof user.password !== 'string' || user.password.startsWith('scrypt$')) {
        throw new Error(`Formato de contraseña no reconocido en usuario ID ${user.id}. Migración cancelada`);
      }
      const hashed = await hashPassword(user.password, { allowLegacy: true });
      await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
      migrated += 1;
    }
    await connection.commit();
    process.stdout.write(`Credenciales migradas: ${migrated}\n`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
