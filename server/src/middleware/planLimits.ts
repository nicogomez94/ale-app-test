import prisma from "../lib/prisma.js";

const PLAN_LIMITS: Record<string, { polizas: number; clientes: number; empresas: number }> = {
  TRIAL: { polizas: 999999, clientes: 999999, empresas: 999999 }, // unlimited during trial
  EMPRENDEDOR: { polizas: 20, clientes: 20, empresas: 20 },
  PROFESIONAL: { polizas: 100, clientes: 100, empresas: 100 },
  AGENCIA: { polizas: 500, clientes: 500, empresas: 500 },
};

export async function checkPlanLimit(
  userId: string,
  resource: "polizas" | "clientes" | "empresas"
): Promise<{ allowed: boolean; message?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) return { allowed: false, message: "Usuario no encontrado" };

  const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.EMPRENDEDOR;
  const limit = limits[resource];

  let count = 0;
  if (resource === "polizas") {
    count = await prisma.policy.count({ where: { userId } });
  } else if (resource === "clientes") {
    count = await prisma.client.count({ where: { userId } });
  } else if (resource === "empresas") {
    count = await prisma.company.count({ where: { userId } });
  }

  if (count >= limit) {
    const planLabel = user.plan === "EMPRENDEDOR" ? "Emprendedor" : user.plan === "PROFESIONAL" ? "Profesional" : "Agencia";
    return {
      allowed: false,
      message: `Has alcanzado el límite de ${limit} ${resource} de tu plan ${planLabel}. Actualiza tu plan para agregar más.`,
    };
  }

  return { allowed: true };
}
