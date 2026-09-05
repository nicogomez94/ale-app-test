import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifePolicyDetails } from './lifePolicyDetails.js';

test('retirement details preserve zero values, dates, currency and contribution frequency', () => {
  const result = lifePolicyDetails({ edad: 40, edadRetiro: 65, incremento: 0, frecuenciaIncremento: 'MENSUAL', moneda: 'USD', fechaInicio: '2026-09-03', numeroPoliza: ' R-123 ' });
  assert.equal(result.edadRetiro, 65);
  assert.equal(result.incremento, 0);
  assert.equal(result.numeroPoliza, 'R-123');
  assert.equal(result.fechaInicio?.toISOString(), '2026-09-03T00:00:00.000Z');
  assert.equal(result.moneda, 'USD');
});
test('partial updates leave unspecified details unchanged and reject invalid values', () => {
  assert.equal(lifePolicyDetails({}).edadRetiro, undefined);
  assert.throws(() => lifePolicyDetails({ edad: 2.5 }));
  assert.throws(() => lifePolicyDetails({ incremento: -1 }));
  assert.throws(() => lifePolicyDetails({ moneda: 'INVALID' }));
});
