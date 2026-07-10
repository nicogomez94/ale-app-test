import { BillingCycle, PlanType } from "../../node_modules/.prisma/client/default.js";
import prisma from "./prisma.js";

export const DEFAULT_PLAN_CONFIGS = [
  {
    plan: PlanType.EMPRENDEDOR,
    name: "Starter",
    monthlyPrice: 6900,
    isVisible: true,
    annualEnabled: true,
    annualDiscountMonths: 2,
    sortOrder: 1,
    features: [
      "Hasta 30 pólizas", "Hasta 30 clientes", "Hasta 30 empresas", "CRM completo",
      "Alertas de vencimiento", "WhatsApp + Email", "Exportación a Excel",
    ],
  },
  {
    plan: PlanType.PROFESIONAL,
    name: "Profesional",
    monthlyPrice: 14900,
    isVisible: true,
    annualEnabled: true,
    annualDiscountMonths: 2,
    sortOrder: 2,
    features: [
      "Todo Starter", "Hasta 150 pólizas", "Análisis de comisiones", "Cierre mensual",
      "Reportes avanzados", "Soporte prioritario",
    ],
  },
  {
    plan: PlanType.AGENCIA,
    name: "Agencia",
    monthlyPrice: 39900,
    isVisible: true,
    annualEnabled: true,
    annualDiscountMonths: 2,
    sortOrder: 3,
    features: ["Todo Profesional", "500+ pólizas", "Multiusuario", "Roles y permisos", "Reportes por productor"],
  },
] as const;

export type PaidPlan = Exclude<PlanType, "TRIAL">;

export async function ensurePlanConfigurations() {
  await Promise.all(DEFAULT_PLAN_CONFIGS.map((config) => prisma.planConfiguration.upsert({
    where: { plan: config.plan },
    update: {},
    create: config,
  })));
}

export async function getPlanConfigurations(options: { visibleOnly?: boolean } = {}) {
  await ensurePlanConfigurations();
  return prisma.planConfiguration.findMany({
    where: options.visibleOnly ? { isVisible: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPlanConfiguration(plan: string) {
  if (!Object.values(PlanType).includes(plan as PlanType) || plan === PlanType.TRIAL) return null;
  await ensurePlanConfigurations();
  return prisma.planConfiguration.findUnique({ where: { plan: plan as PaidPlan } });
}

export function getCyclePrice(config: { monthlyPrice: number; annualDiscountMonths: number }, cycle: BillingCycle) {
  return cycle === BillingCycle.ANNUAL
    ? config.monthlyPrice * (12 - config.annualDiscountMonths)
    : config.monthlyPrice;
}

export function serializePlanConfiguration(config: {
  plan: PlanType;
  name: string;
  monthlyPrice: number;
  isVisible: boolean;
  annualEnabled: boolean;
  annualDiscountMonths: number;
  features: unknown;
  sortOrder: number;
}) {
  return {
    key: config.plan,
    name: config.name,
    monthlyPrice: config.monthlyPrice,
    isVisible: config.isVisible,
    annualEnabled: config.annualEnabled,
    annualDiscountMonths: config.annualDiscountMonths,
    annualPrice: getCyclePrice(config, BillingCycle.ANNUAL),
    features: Array.isArray(config.features) ? config.features.filter((item): item is string => typeof item === "string") : [],
    sortOrder: config.sortOrder,
  };
}
