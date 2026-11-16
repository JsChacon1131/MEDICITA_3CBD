const userRepository = require('../repositories/user.repository');
const validate = require('../utils/validate');
const { verifyPassword } = require('../utils/password');
const { ApiError } = require('../utils/errors');

async function verifyCredentials(body) {
  const email = validate.email(body?.email);
  const password = validate.requiredText(body?.password, 'password');
  const user = await userRepository.findByEmail(email);
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new ApiError(401, 'Credenciales incorrectas');
  }
  const { password: omittedPassword, ...publicUser } = user;
  return publicUser;
}

module.exports = { verifyCredentials };
