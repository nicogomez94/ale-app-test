import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prisma from './prisma.js';
import { getPolicyGroupWhere } from './policyGroup.js';
import { lifePolicyDetails } from './lifePolicyDetails.js';

test('local database: legacy deletion removes parent and children; retirement fields persist', { skip: process.env.RUN_LOCAL_DB_TESTS !== 'true' }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname));
  const rollback = new Error('ROLLBACK_TEST_ONLY');
  try {
    await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { email: `test-${crypto.randomUUID()}@example.invalid`, nombre: 'Rollback test', password: 'not-a-login-hash', referralCode: crypto.randomUUID() } });
      const base = { userId: user.id, clienteNombre: 'Rollback test', aseguradora: 'Test', rubro: 'Test', numeroPoliza: 'TEST-ONLY', fechaInicio: new Date(), fechaVencimiento: new Date(), prima: 10, porcentajeComision: 0, comisionCalculada: 0 };
      const parent = await tx.policy.create({ data: base });
      const child = await tx.policy.create({ data: { ...base, groupId: parent.id, cuotaActual: 2 } });
      const unrelated = await tx.policy.create({ data: { ...base, groupId: crypto.randomUUID() } });
      const deleted = await tx.policy.deleteMany({ where: getPolicyGroupWhere(child, user.id) });
      assert.equal(deleted.count, 2);
      assert.equal(await tx.policy.count({ where: { id: unrelated.id } }), 1);
      const life = await tx.lifePolicy.create({ data: { userId: user.id, cliente: 'Rollback test', cuit: '12345678', aseguradora: 'Test', tipo: 'RETIRO', ...lifePolicyDetails({ edad: 40, edadRetiro: 65, incremento: 0, fechaVencimiento: '2026-10-01', moneda: 'USD' }) } });
      const saved = await tx.lifePolicy.findUniqueOrThrow({ where: { id: life.id } });
      assert.equal(saved.edadRetiro, 65);
      assert.equal(saved.moneda, 'USD');
      throw rollback;
    });
    assert.fail('The transaction must be rolled back');
  } catch (error) { if (error !== rollback) throw error; }
  finally { await prisma.$disconnect(); }
});
