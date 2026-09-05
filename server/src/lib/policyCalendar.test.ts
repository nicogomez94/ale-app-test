import { test } from 'node:test';
import assert from 'node:assert/strict';
import { policyDaysRemaining } from './policyCalendar.js';

test('vence hoy remains today after UTC midnight until midnight in Argentina', () => {
  const expiry = new Date('2026-09-03T00:00:00Z');
  assert.equal(policyDaysRemaining(expiry, new Date('2026-09-04T02:59:59Z')), 0);
  assert.equal(policyDaysRemaining(expiry, new Date('2026-09-04T03:00:00Z')), -1);
  assert.equal(policyDaysRemaining(expiry, new Date('2026-09-03T02:59:59Z')), 1);
});
