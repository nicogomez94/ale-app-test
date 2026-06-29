export type PolicyCleanupCandidate = {
  id: string;
  userId: string;
  groupId: string | null;
  fechaVencimiento: Date;
};

export type ExpiredPolicyGroup = {
  userId: string;
  policyGroupId: string;
  memberIds: string[];
  latestExpiration: Date;
};

export function getExpiredPolicyGroups(
  policies: PolicyCleanupCandidate[],
  now = new Date(),
  retentionDays = 60
): ExpiredPolicyGroup[] {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const groups = new Map<string, ExpiredPolicyGroup>();

  for (const policy of policies) {
    const policyGroupId = policy.groupId || policy.id;
    const key = `${policy.userId}:${policyGroupId}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        userId: policy.userId,
        policyGroupId,
        memberIds: [policy.id],
        latestExpiration: policy.fechaVencimiento,
      });
      continue;
    }
    existing.memberIds.push(policy.id);
    if (policy.fechaVencimiento > existing.latestExpiration) {
      existing.latestExpiration = policy.fechaVencimiento;
    }
  }

  return Array.from(groups.values()).filter((group) => group.latestExpiration.getTime() < cutoff);
}
