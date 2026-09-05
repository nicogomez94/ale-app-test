import type { Prisma } from '@prisma/client';

// Legacy first installments have no groupId; their children use the parent's id.
export function getPolicyGroupWhere(policy: { id: string; groupId: string | null }, userId: string): Prisma.PolicyWhereInput {
  const groupId = policy.groupId || policy.id;
  return { userId, OR: [{ groupId }, { id: groupId, groupId: null }] };
}
