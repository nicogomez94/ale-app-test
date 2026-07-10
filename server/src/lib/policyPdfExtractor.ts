import { PDFParse } from "pdf-parse";
import { PolicyVigencia } from "@prisma/client";
import { inferVigenciaFromDates } from "./generalPolicies.js";

export type ExtractedInstallment = {
  numero?: number;
  vencimiento?: string;
  importe?: number;
};

export type PolicyImportData = {
  clienteNombre?: string;
  clienteDni?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  clienteDireccion?: string;
  aseguradora?: string;
  rubro?: string;
  numeroPoliza?: string;
  endoso?: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  medioPago?: string;
  vigencia?: PolicyVigencia;
  prima?: number;
  premioTotal?: number;
  porcentajeComision?: number;
  moneda?: "ARS" | "USD" | "EUR" | "BRL";
  cobertura?: string;
  patente?: string;
  chasis?: string;
  motor?: string;
  direccionRiesgo?: string;
  cuotas?: ExtractedInstallment[];
};

export type PolicyExtractionResult = {
  data: PolicyImportData;
  foundFields: string[];
  missingFields: string[];
  warnings: string[];
  text: string;
};

const REQUIRED_FIELDS: Array<{ key: keyof PolicyImportData; label: string }> = [
  { key: "aseguradora", label: "Compañía aseguradora" },
  { key: "rubro", label: "Rubro" },
  { key: "numeroPoliza", label: "Número de póliza" },
  { key: "fechaInicio", label: "Vigencia desde" },
  { key: "fechaVencimiento", label: "Vigencia hasta" },
  { key: "clienteNombre", label: "Asegurado" },
  { key: "clienteDni", label: "DNI/CUIT" },
  { key: "cobertura", label: "Cobertura" },
];

const DEFAULT_INSURERS = [
  "Federacion Patronal Seguros",
  "Sancor Seguros",
  "La Segunda Seguros",
  "Mercantil Andina",
  "Zurich Argentina",
  "Allianz Argentina",
  "Mapfre Argentina",
  "Provincia Seguros",
  "Galicia Seguros",
  "BBVA Seguros",
  "SMG Seguros",
  "La Caja Seguros",
  "Seguros Rivadavia",
  "Triunfo Seguros",
  "ATM Seguros",
  "San Cristobal Seguros",
  "Berkley Argentina",
  "Chubb Argentina",
  "HDI Seguros",
  "Integrity Seguros",
  "Orbis Seguros",
  "Nacion Seguros",
  "Rio Uruguay Seguros",
  "Parana Seguros",
  "Victoria Seguros",
  "Prevencion ART",
  "Provincia ART",
  "Experta ART",
  "La Segunda ART",
  "Galeno ART",
  "Swiss Medical ART",
  "Asociart ART",
  "La Equidad Seguros",
];

const RUBRO_MAPPINGS: Array<{ keywords: string[]; rubro: string }> = [
  { keywords: ["automotor", "automotores", "auto", "vehiculo", "vehículo"], rubro: "Automoviles" },
  { keywords: ["moto", "motovehiculo", "motovehículo"], rubro: "Motos" },
  { keywords: ["camion", "camión"], rubro: "Camiones" },
  { keywords: ["flota"], rubro: "Flotas vehiculares" },
  { keywords: ["hogar", "vivienda"], rubro: "Hogar" },
  { keywords: ["integral de comercio", "comercio"], rubro: "Integral de comercio" },
  { keywords: ["todo riesgo operativo", "tro"], rubro: "Todo Riesgo Operativo (TRO)" },
  { keywords: ["consorcio"], rubro: "Consorcio" },
  { keywords: ["art", "riesgos del trabajo"], rubro: "ART (Aseguradora de Riesgos del Trabajo)" },
  { keywords: ["accidentes personales"], rubro: "Accidentes personales" },
  { keywords: ["responsabilidad civil"], rubro: "Responsabilidad Civil General" },
  { keywords: ["caucion", "caución"], rubro: "Caucion" },
  { keywords: ["transporte"], rubro: "Transporte de mercaderias" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[\s:.-]+|[\s:.-]+$/g, "").trim();
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1] ? cleanLine(match[1]) : undefined;
    if (value) return value;
  }
  return undefined;
}

export function parseArgentineAmount(value: string): number | undefined {
  const cleaned = value.replace(/[^\d.,-]/g, "");
  if (!cleaned) return undefined;

  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  const decimalSeparator = comma > dot ? "," : dot > -1 && cleaned.length - dot <= 3 ? "." : comma > -1 ? "," : "";
  let normalized = cleaned;

  if (decimalSeparator) {
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandSeparator).join("").replace(decimalSeparator, ".");
  } else {
    normalized = normalized.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePolicyDate(value: string): string | undefined {
  const match = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().split("T")[0];
}

function inferVigencia(start?: string, end?: string): PolicyVigencia | undefined {
  if (!start || !end) return undefined;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;
  return inferVigenciaFromDates(startDate, endDate);
}

function parseOptionalDate(value?: string): string | undefined {
  return value ? parsePolicyDate(value) : undefined;
}

function detectInsurer(text: string, directoryInsurers: string[]): string | undefined {
  const normalizedText = normalize(text);
  const allInsurers = Array.from(new Set([...directoryInsurers, ...DEFAULT_INSURERS].filter(Boolean)));
  const matched = allInsurers
    .filter((insurer) => normalizedText.includes(normalize(insurer)))
    .sort((a, b) => b.length - a.length)[0];
  if (matched) return matched;

  return firstMatch(text, [
    /(?:compa(?:ñ|n)ia|aseguradora|asegurador)\s*:?\s*([^\n]{3,80})/i,
    /(?:emitida por|emisor)\s*:?\s*([^\n]{3,80})/i,
  ]);
}

export function mapRamoToRubro(text: string): string | undefined {
  const normalizedText = normalize(text);
  const explicitRamo = firstMatch(text, [
    /(?:ramo|secci[oó]n|producto)\s*:?\s*([^\n]{3,80})/i,
    /(?:seguro de)\s+([^\n]{3,80})/i,
  ]);
  const searchSpace = normalize(`${explicitRamo || ""} ${normalizedText.slice(0, 5000)}`);
  return RUBRO_MAPPINGS.find((mapping) => mapping.keywords.some((keyword) => searchSpace.includes(normalize(keyword))))?.rubro;
}

function detectPolicyAndEndorsement(text: string): Pick<PolicyImportData, "numeroPoliza" | "endoso"> {
  const paired = text.match(/p[oó]liza\s*\/\s*endoso\s*:?\s*([A-Z0-9.-]+)\s*\/\s*([A-Z0-9.-]+)/i);
  if (paired) return { numeroPoliza: cleanLine(paired[1]), endoso: cleanLine(paired[2]) };

  const numeroPoliza = firstMatch(text, [
    /p[oó]liza\s*(?:n(?:ro|°|º)?|n[uú]mero|num\.?)?\s*:?\s*([A-Z0-9][A-Z0-9./-]{2,})/i,
    /n(?:ro|°|º)?\s*de\s*p[oó]liza\s*:?\s*([A-Z0-9][A-Z0-9./-]{2,})/i,
  ]);
  const endoso = firstMatch(text, [
    /endoso\s*(?:n(?:ro|°|º)?|n[uú]mero|num\.?)?\s*:?\s*([A-Z0-9][A-Z0-9./-]{2,})/i,
  ]);
  return { numeroPoliza, endoso };
}

function detectDates(text: string): Pick<PolicyImportData, "fechaInicio" | "fechaVencimiento" | "vigencia"> {
  const compact = text.replace(/\s+/g, " ");
  const vigencia = compact.match(/(?:vigencia|desde)\D{0,40}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\D{0,40}(?:hasta|al)\D{0,20}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  const desdeHasta = compact.match(/desde\D{0,20}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\D{0,40}hasta\D{0,20}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  const match = vigencia || desdeHasta;
  const fechaInicio = match ? parsePolicyDate(match[1]) : parseOptionalDate(firstMatch(text, [/fecha\s*(?:inicio|desde)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i]));
  const fechaVencimiento = match ? parsePolicyDate(match[2]) : parseOptionalDate(firstMatch(text, [/fecha\s*(?:vencimiento|hasta)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i]));
  return { fechaInicio, fechaVencimiento, vigencia: inferVigencia(fechaInicio, fechaVencimiento) };
}

function detectInsured(text: string): Pick<PolicyImportData, "clienteNombre" | "clienteDni" | "clienteDireccion"> {
  const clienteDni = firstMatch(text, [
    /(?:cuit|cuil|cuit\/cuil|cuil\/cuit|dni|documento)\s*:?\s*([0-9.\-\s]{7,16})/i,
  ])?.replace(/\D/g, "");

  const clienteNombre = firstMatch(text, [
    /(?:asegurado|tomador|contratante)\s*:?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,90})/i,
    /(?:nombre y apellido|raz[oó]n social)\s*:?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,90})/i,
  ])?.replace(/\b(?:cuit|cuil|dni|documento)\b.*$/i, "").trim();

  const clienteDireccion = firstMatch(text, [
    /(?:domicilio|direcci[oó]n)\s*:?\s*([^\n]{5,120})/i,
  ]);

  return { clienteNombre, clienteDni, clienteDireccion };
}

function detectAmounts(text: string): Pick<PolicyImportData, "prima" | "premioTotal" | "moneda"> {
  const primaRaw = firstMatch(text, [
    /prima(?:\s+total)?\s*:?\s*(?:\$|ars|usd)?\s*([0-9][0-9.,]*)/i,
  ]);
  const premioRaw = firstMatch(text, [
    /premio(?:\s+total)?\s*:?\s*(?:\$|ars|usd)?\s*([0-9][0-9.,]*)/i,
  ]);
  const moneda = /\bUSD\b|U\$S/i.test(text) ? "USD" : "ARS";
  return {
    prima: primaRaw ? parseArgentineAmount(primaRaw) : undefined,
    premioTotal: premioRaw ? parseArgentineAmount(premioRaw) : undefined,
    moneda,
  };
}

function detectRiskData(text: string): Pick<PolicyImportData, "cobertura" | "patente" | "chasis" | "motor" | "direccionRiesgo"> {
  const cobertura = firstMatch(text, [
    /(?:cobertura|plan)\s*:?\s*([^\n]{3,140})/i,
    /(?:tipo de cobertura)\s*:?\s*([^\n]{3,140})/i,
  ]);
  const patente = firstMatch(text, [
    /(?:patente|dominio)\s*:?\s*([A-Z]{2,3}\s?[0-9]{3}\s?[A-Z]{0,2}|[A-Z]{2}\s?[0-9]{3}\s?[A-Z]{2})/i,
  ])?.replace(/\s+/g, "").toUpperCase();
  const chasis = firstMatch(text, [
    /(?:chasis|vin)\s*:?\s*([A-Z0-9]{8,25})/i,
  ])?.toUpperCase();
  const motor = firstMatch(text, [
    /(?:motor)\s*:?\s*([A-Z0-9]{6,25})/i,
  ])?.toUpperCase();
  const direccionRiesgo = firstMatch(text, [
    /(?:direcci[oó]n del riesgo|ubicaci[oó]n del riesgo|riesgo ubicado en)\s*:?\s*([^\n]{5,140})/i,
  ]);
  return { cobertura, patente, chasis, motor, direccionRiesgo };
}

function detectInstallments(text: string): ExtractedInstallment[] {
  const compact = text.replace(/\s+/g, " ");
  const matches = Array.from(compact.matchAll(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\D{0,30}(?:\$|ars)?\s*([0-9][0-9.,]*)/gi));
  return matches
    .map((match, index) => ({
      numero: index + 1,
      vencimiento: parsePolicyDate(match[1]),
      importe: parseArgentineAmount(match[2]),
    }))
    .filter((item) => item.vencimiento || item.importe)
    .slice(0, 24);
}

function compactText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildCompleteness(data: PolicyImportData): Pick<PolicyExtractionResult, "foundFields" | "missingFields" | "warnings"> {
  const foundFields = REQUIRED_FIELDS.filter(({ key }) => Boolean(data[key])).map(({ label }) => label);
  const missingFields = REQUIRED_FIELDS.filter(({ key }) => !data[key]).map(({ label }) => label);
  if (!data.prima && !data.premioTotal) missingFields.push("Prima o premio total");
  else foundFields.push(data.prima ? "Prima" : "Premio total");

  const warnings: string[] = [];
  if (!data.cuotas?.length) warnings.push("No se detectaron cuotas en formato legible.");
  if (data.premioTotal && !data.prima) warnings.push("Se usará el premio total como prima si no se completa una prima separada.");
  return { foundFields, missingFields, warnings };
}

export function extractPolicyDataFromText(rawText: string, directoryInsurers: string[] = []): PolicyExtractionResult {
  const text = compactText(rawText);
  const data: PolicyImportData = {
    ...detectPolicyAndEndorsement(text),
    ...detectDates(text),
    ...detectInsured(text),
    ...detectAmounts(text),
    ...detectRiskData(text),
    aseguradora: detectInsurer(text, directoryInsurers),
    rubro: mapRamoToRubro(text),
    medioPago: "Cupon",
    porcentajeComision: 15,
  };
  data.cuotas = detectInstallments(text);
  if (!data.prima && data.premioTotal) data.prima = data.premioTotal;

  const completeness = buildCompleteness(data);
  if (text.length < 100) {
    completeness.warnings.push("No se pudo leer automáticamente; completá los datos manualmente.");
  }

  return { data, ...completeness, text };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return compactText(result.text || "");
  } finally {
    await parser.destroy().catch(() => {});
  }
}
