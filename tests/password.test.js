const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, isPasswordHash } = require('../src/utils/password');

test('Cada contraseña usa un salt aleatorio independiente', async () => {
  const first = await hashPassword('SecurePassword123!');
  const second = await hashPassword('SecurePassword123!');
  assert.notEqual(first, second);
  assert.ok(isPasswordHash(first));
  assert.ok(await verifyPassword('SecurePassword123!', first));
  assert.equal(await verifyPassword('IncorrectPassword123!', first), false);
});

test('Una contraseña en texto plano nunca se acepta como hash', async () => {
  assert.equal(await verifyPassword('oldpassword', 'oldpassword'), false);
  await assert.rejects(() => hashPassword('short'), /contraseña/);
});
