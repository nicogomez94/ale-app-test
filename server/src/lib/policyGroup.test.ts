import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPolicyGroupWhere } from './policyGroup.js';

test('legacy parent and child resolve the same deletion scope, restricted to the owner', () => {
  const expected = { userId: 'owner', OR: [{ groupId: 'parent' }, { id: 'parent', groupId: null }] };
  assert.deepEqual(getPolicyGroupWhere({ id: 'parent', groupId: null }, 'owner'), expected);
  assert.deepEqual(getPolicyGroupWhere({ id: 'child', groupId: 'parent' }, 'owner'), expected);
});

test('modern groups do not match unrelated policy numbers or clients', () => {
  assert.deepEqual(getPolicyGroupWhere({ id: 'quota', groupId: 'group' }, 'owner'), {
    userId: 'owner', OR: [{ groupId: 'group' }, { id: 'group', groupId: null }],
  });
});
