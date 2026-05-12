import { CompanyType, PolicyType, PolicyVigencia } from "@prisma/client";

const ART_KEYWORDS = ["art", "accidentes personales"];
const FLOTAS_KEYWORDS = ["flotas", "camiones", "transporte de carga", "vehiculos agricolas", "maquinaria vial"];
const TRO_KEYWORDS = ["tro", "todo riesgo operativo"];
const CONSORCIO_KEYWORDS = ["consorcio"];
const INTEGRAL_KEYWORDS = [
  "integral de comercio",
  "oficinas",
  "industrias",
  "pymes",
  "riesgos varios",
  "caucion",
  "credito",
  "garantias contractuales",
  "seguro de credito",
  "todo riesgo construccion",
  "trc",
  "todo riesgo montaje",
  "trm",
  "rotura de maquinaria",
  "equipos contratistas",
];

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function includesAny(input: string, values: string[]): boolean {
  return values.some((value) => input.includes(value));
}

export function classifyPolicyTypeFromRubro(rubro: string): PolicyType {
  return mapRubroToCompanyType(rubro) ? "EMPRESA" : "INDIVIDUAL";
}

export function mapRubroToCompanyType(rubro: string): CompanyType | null {
  const normalized = normalize(rubro);
  if (!normalized) return null;

  if (includesAny(normalized, ART_KEYWORDS)) return "ART";
  if (includesAny(normalized, FLOTAS_KEYWORDS)) return "FLOTAS";
  if (includesAny(normalized, TRO_KEYWORDS)) return "TRO";
  if (includesAny(normalized, CONSORCIO_KEYWORDS)) return "CONSORCIO";
  if (includesAny(normalized, INTEGRAL_KEYWORDS)) return "INTEGRAL_DE_COMERCIO";
  return null;
}

export function inferVigenciaFromDates(fechaInicio: Date, fechaVencimiento: Date): PolicyVigencia {
  const diffMs = fechaVencimiento.getTime() - fechaInicio.getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays <= 45) return "MENSUAL";
  if (diffDays <= 75) return "BIMESTRAL";
  if (diffDays <= 120) return "TRIMESTRAL";
  if (diffDays <= 220) return "SEMESTRAL";
  return "ANUAL";
}

export function getQuotaTotalFromVigencia(vigencia: PolicyVigencia): number {
  switch (vigencia) {
    case "MENSUAL":
      return 1;
    case "BIMESTRAL":
      return 2;
    case "TRIMESTRAL":
      return 3;
    case "SEMESTRAL":
      return 6;
    case "ANUAL":
    default:
      return 12;
  }
}

export function getVigenciaLabel(vigencia: PolicyVigencia): string {
  switch (vigencia) {
    case "MENSUAL":
      return "Mensual";
    case "BIMESTRAL":
      return "Bimestral";
    case "TRIMESTRAL":
      return "Trimestral";
    case "SEMESTRAL":
      return "Semestral";
    case "ANUAL":
    default:
      return "Anual";
  }
}
