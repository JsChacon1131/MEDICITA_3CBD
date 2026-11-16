const test = require('node:test');
const assert = require('node:assert/strict');
const repositoryPath = require.resolve('../src/repositories/finance.repository');
require.cache[repositoryPath] = {
  id: repositoryPath,
  filename: repositoryPath,
  loaded: true,
  exports: {
    listAppointments: async () => [
      { status: 'scheduled', price_at_booking: 85000 },
      { status: 'completed', price_at_booking: 120000 },
      { status: 'completed', price_at_booking: 90000 },
      { status: 'cancelled', price_at_booking: 85000 }
    ]
  }
};
const service = require('../src/services/finance.service');
test('Reporte agrupa valores de citas según estado, no como pagos recibidos', async () => {
  const report = await service.report({});
  assert.deepEqual(report.summary.completed, { count: 2, value: 210000 });
  assert.deepEqual(report.summary.scheduled, { count: 1, value: 85000 });
  assert.deepEqual(report.summary.cancelled, { count: 1, value: 85000 });
});
test('Reporte rechaza fechas invertidas', async () => {
  await assert.rejects(() => service.report({ from: '2026-12-01', to: '2026-11-01' }), { status: 400 });
});
