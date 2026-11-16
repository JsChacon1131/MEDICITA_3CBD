const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const context = vm.createContext({
  document: { getElementById: () => ({}) },
  Intl,
  Date
});
vm.runInContext(code.replace(/renderAuth\(\);\s*$/, ''), context);
const renderResult = (result) => vm.runInContext(`renderResultDetail(${JSON.stringify(result)})`, context);

test('Muestra el resultado numérico con unidades y rango de referencia', () => {
  const html = renderResult({
    exam_name: 'Glucosa en sangre - Prueba',
    result_type: 'numeric',
    created_at: '2026-11-16T00:14:49.000Z',
    detail: { measured_value: 92, unit: 'mg/dL', reference_min: 70, reference_max: 99 }
  });
  assert.match(html, /Glucosa en sangre - Prueba/);
  assert.match(html, /92 <span>mg\/dL<\/span>/);
  assert.match(html, /70 – 99 mg\/dL/);
  assert.doesNotMatch(html, /"detail"/);
});

test('Indica que el detalle del examen aún no está disponible', () => {
  const html = renderResult({exam_name: 'Prueba', result_type: 'numeric', detail: null});
  assert.match(html, /todavía no está disponible/);
});

test('Escapa contenido de campos de resultados médicos', () => {
  const html = renderResult({exam_name: '<script>alert(1)</script>', result_type: 'qualitative', detail: {finding: '<img src=x onerror=alert(1)>'}});
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});
