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
  "Federación Patronal Seguros S.A.U.",
  "Federacion Patronal Seguros",
  "La Equidad Social Compañía de Seguros Patrimoniales S.A.",
  "La Equidad Social Compania de Seguros Patrimoniales S.A.",
  "La Equidad Social Compañía de Seguros Patrimoniales",
  "La Equidad Social Compania de Seguros Patrimoniales",
  "La Equidad Seguros",
  "ATM Compañía de Seguros S.A.",
  "ATM Compania de Seguros S.A.",
  "Experta Seguros S.A.U.",
  "Sancor Cooperativa de Seguros Ltda.",
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

function cleanIdentifier(value: string): string | undefined {
  const cleaned = cleanLine(value).replace(/\s+/g, " ");
  if (!cleaned || !/\d/.test(cleaned)) return undefined;
  if (/^(?:ENDOSO|SECCI[OÓ]N|SUPLEMENTO|LIQUIDACI[OÓ]N|NRO|N[ÚU]MERO)$/i.test(cleaned)) return undefined;
  return cleaned;
}

function cleanPersonName(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = cleanLine(value)
    .replace(/^\d{4,10}\s+/, "")
    .replace(/\b(?:CUIT|CUIL|DNI|DOCUMENTO)\b.*$/i, "")
    .trim();
  if (cleaned.length < 4 || cleaned.length > 100) return undefined;
  if (/\b(?:QUIEN|M[ÁA]S ADELANTE|LUGAR Y FECHA|DOMICILIO|LOCALIDAD|ASEGURADORA|SEGURO OBLIGATORIO|CONVIENEN|P[ÓO]LIZA)\b/i.test(cleaned)) return undefined;
  if ((cleaned.match(/[A-ZÁÉÍÓÚÜÑa-záéíóúüñ]+/g) || []).length < 2) return undefined;
  return cleaned;
}

function cleanAddress(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = cleanLine(value);
  if (cleaned.length < 5 || cleaned.length > 140) return undefined;
  if (/^(?:DOMICILIO|LOCALIDAD|PROVINCIA|DIRECCI[OÓ]N|ES DE ASEGURADORAS|VIG[EÊ]NCIA|VIGENCIA|VALIDEZ)/i.test(cleaned)) return undefined;
  if (/\b(?:que fuere|se haya facilitado|protecci[oó]n de datos|www\.)\b/i.test(cleaned)) return undefined;
  return cleaned;
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
  const numeric = value.match(/(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})(?!\d)/);
  const named = value.match(/(?<!\d)(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(\d{4}|\d{2})(?!\d)/i);
  if (!numeric && !named) return undefined;
  const match = numeric || named!;
  const day = Number(match[1]);
  const month = numeric
    ? Number(match[2])
    : ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
      .indexOf(normalize(match[2]).replace("setiembre", "septiembre")) + 1;
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  if (year < 1900 || year > 2100) return undefined;
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
  const normalizedText = normalize(text).replace(/[^a-z0-9]+/g, " ");
  const allInsurers = Array.from(new Set([...directoryInsurers, ...DEFAULT_INSURERS].filter(Boolean)));
  const matched = allInsurers
    .map((insurer) => ({ insurer, index: normalizedText.indexOf(normalize(insurer).replace(/[^a-z0-9]+/g, " ").trim()) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index || b.insurer.length - a.insurer.length)[0]?.insurer;
  if (matched) return matched;

  return firstMatch(text, [
    /(?:^|\n)\s*compa(?:ñ|n)[ií]a\s+aseguradora\s*:\s*([^\n]{3,100})/im,
    /(?:^|\n)\s*(?:emitida por|emisor)\s*:\s*([^\n]{3,100})/im,
  ]);
}

export function mapRamoToRubro(text: string): string | undefined {
  const normalizedText = normalize(text);
  const frontText = normalize(text.slice(0, 8000));
  if (/\bseccion\s+motovehiculos\b|\bmotocicletas?\b|\bmotonetas?\b/.test(frontText)) return "Motos";
  if (/\bseccion\s+automotores\b|\bseguro obligatorio automotor\b|\bautomovil(?:es)?\b|\bvehiculo asegurado\b/.test(frontText)) return "Automoviles";
  if (/\bseguro de hogar\b|\bcombinado familiar\b/.test(frontText)) return "Hogar";
  if (/\baccidentes personales\b/.test(frontText)) return "Accidentes personales";

  const explicitRamo = firstMatch(text, [
    /(?:ramo|secci[oó]n|producto)\s*:?\s*([^\n]{3,80})/i,
    /(?:seguro de)\s+([^\n]{3,80})/i,
  ]);
  const searchSpace = normalize(`${explicitRamo || ""} ${normalizedText.slice(0, 5000)}`);
  return RUBRO_MAPPINGS.find((mapping) => mapping.keywords.some((keyword) => {
    const escaped = normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(searchSpace);
  }))?.rubro;
}

function detectPolicyAndEndorsement(text: string): Pick<PolicyImportData, "numeroPoliza" | "endoso"> {
  const reverseHeader = text.match(/(?:^|\n)\s*(\d{1,4})\s+(\d{5,12})\s*\n\s*VIGENCIA\s+P[ÓO]LIZA\s+N[º°]?\s+ENDOSO\s+N[º°]?\s+SECCI[ÓO]N/im);
  const labeledPair = text.match(/p[oó]liza\s*\/\s*endoso\s*:?\s*(\d[\d.-]{4,})\s*\/\s*(\d{1,8})/i);
  const numeroPoliza = cleanIdentifier(reverseHeader?.[2] || firstMatch(text, [
    /p[oó]liza\s*\/\s*endoso\s*:?\s*(\d[\d.-]{4,})\s*\/\s*\d{1,8}/i,
    /\bp[oó]liza\s*(?:nro\.?|n[°º]|n[uú]mero|num\.?)\s*:?\s*(\d[\d.-]{4,})/i,
    /(?:^|\n)\s*[.·•-]*\s*N[°º]?\s*de\s*p[oó]liza\s*:?\s*(\d[\d.-]{4,})/im,
    /(?:^|\n)\s*p[oó]liza\s*(?:nro\.?|n[°º]|n[uú]mero|num\.?)\s*:?\s*(\d[\d.-]{4,})/im,
    /(?:^|\n)[^\n]{0,50}\bp[oó]liza\s+(\d{5,12})\s*(?:\/|$)/im,
  ]) || "");

  const paired = numeroPoliza
    ? text.match(new RegExp(`p[oó]liza\\s*:?\\s*${numeroPoliza.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\/\\s*(\\d{1,6})`, "i"))
    : undefined;
  const endoso = cleanIdentifier(firstMatch(text, [
    /(?:^|\n)\s*Endoso\s+Lugar de emisi[oó]n\s*\n\s*(\d{1,8})/im,
    /(?:^|\n)\s*ENDOSO\s+SUPLEMENTO\s*\n\s*(\d{1,10})\s+\d{1,6}/im,
    /p[oó]liza\s*\/\s*endoso\s*:?\s*[A-Z0-9.-]+\s*\/\s*(\d{1,8})/i,
  ]) || reverseHeader?.[1] || labeledPair?.[2] || paired?.[1] || "");
  return { numeroPoliza, endoso };
}

function detectDates(text: string): Pick<PolicyImportData, "fechaInicio" | "fechaVencimiento" | "vigencia"> {
  const date = "(\\d{1,2}[/-]\\d{1,2}[/-](?:\\d{4}|\\d{2})|\\d{1,2}\\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\\s+(?:\\d{4}|\\d{2}))";
  const patterns = [
    new RegExp(`Vigencia\\s+de\\s+p[oó]liza[\\s\\S]{0,40}?Desde\\s+el\\s+${date}[\\s\\S]{0,30}?Hasta\\s+el\\s+${date}`, "i"),
    new RegExp(`Vigencia\\s+Desde\\s+Vigencia\\s+Hasta[\\s\\S]{0,100}?Desde[\\s\\S]{0,35}?${date}[\\s\\S]{0,35}?Hasta[\\s\\S]{0,35}?${date}`, "i"),
    new RegExp(`Desde\\s+las[\\s\\S]{0,30}?del\\s+${date}[\\s\\S]{0,45}?Hasta\\s+las[\\s\\S]{0,30}?del\\s+${date}`, "i"),
    new RegExp(`Desde\\s+el\\s+${date}[\\s\\S]{0,30}?hasta\\s+el\\s+${date}`, "i"),
    new RegExp(`(?:VIGENCIA|Validez)[\\s\\S]{0,100}?Desde[\\s\\S]{0,25}?${date}[\\s\\S]{0,45}?(?:Hasta|Al)[\\s\\S]{0,25}?${date}`, "i"),
  ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  let fechaInicio = match ? parsePolicyDate(match[1]) : parseOptionalDate(firstMatch(text, [
    /(?:fecha\s*(?:inicio|desde)|inicio de vigencia del seguro)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))/i,
  ]));
  let fechaVencimiento = match ? parsePolicyDate(match[2]) : parseOptionalDate(firstMatch(text, [
    /(?:fecha\s*(?:vencimiento|hasta)|validez de la tarjeta de seguro hasta el)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))/i,
  ]));

  const extension = text.match(new RegExp(`Pr[oó]rroga\\s+Autom[aá]tica\\s+de\\s+Vigencia\\s+Hasta[\\s\\S]{0,30}?${date}`, "i"));
  const extendedEnd = extension ? parsePolicyDate(extension[1]) : undefined;
  if (fechaInicio && extendedEnd && extendedEnd > (fechaVencimiento || "")) fechaVencimiento = extendedEnd;
  return { fechaInicio, fechaVencimiento, vigencia: inferVigencia(fechaInicio, fechaVencimiento) };
}

function detectInsured(text: string): Pick<PolicyImportData, "clienteNombre" | "clienteDni" | "clienteDireccion" | "clienteTelefono" | "clienteEmail"> {
  const bbva = text.match(/TOMADOR\s+LUGAR Y FECHA DE EMISI[OÓ]N\s*\n\s*([^\n]+)\s*\n\s*CUIL\s+([\d.-]{7,16})\s*\n\s*([^\n]+)/i);
  const reversed = text.match(/CUIL\/CUIT\s*\n\s*(?:C\.?A\.?B\.?A\.?|BUENOS AIRES)\s*\n\s*([^\n]+)\s*\n\s*([^\n]+)\s*\n\s*([\d.-]{8,16})\s+[^\n]+/i);
  const sancor = /\bCombinado Familiar\b/i.test(text)
    ? text.match(/(?:^|\n)\s*Emisi[oó]n\s+([^\n]+)\s*\n\s*([^\n]+)/im)
    : undefined;

  const clienteNombre = cleanPersonName(
    bbva?.[1]
      || reversed?.[1]
      || sancor?.[1]
      || firstMatch(text, [
        /(?:^|\n)\s*[.·•-]*\s*(?:asegurado|tomador|contratante)\s*:?\s+([^\n]{3,100})/im,
        /(?:^|\n)\s*(?:nombre y apellido|raz[oó]n social)\s*:?\s+([^\n]{3,100})/im,
      ]),
  );
  const clienteDni = (
    bbva?.[2]
      || reversed?.[3]
      || firstMatch(text, [
        /(?:^|\n)[^\n]{0,80}\b(?:CUIT\/CUIL|CUIL\/CUIT|CUIL|DNI)\s*:?\s*([0-9.\-]{7,16})(?:\s|$)/im,
        /(?:^|\n)\s*[.·•-]*\s*Tipo y N[°º]? de Documento\s*:?\s*([0-9.\-]{7,16})/im,
      ])
  )?.replace(/\D/g, "");
  const clienteDireccion = cleanAddress(
    bbva?.[3]
      || reversed?.[2]
      || sancor?.[2]
      || firstMatch(text, [
        /(?:^|\n)\s*[.·•-]*\s*(?:domicilio|direcci[oó]n)\s*:?\s+([^\n]{5,140})/im,
      ]),
  );
  const clienteTelefono = reversed
    ? firstMatch(text.slice(0, 3000), [/(?:^|\n)[^\n]{0,100}\bTel\.?\s*:\s*([+\d][\d\s()-]{7,20})/im])?.replace(/[^+\d]/g, "")
    : undefined;
  const clienteEmail = undefined;

  return { clienteNombre, clienteDni, clienteDireccion, clienteTelefono, clienteEmail };
}

function detectAmounts(text: string): Pick<PolicyImportData, "prima" | "premioTotal" | "moneda"> {
  const amount = "([0-9][0-9.,]*[.,][0-9]{2})";
  let primaRaw = firstMatch(text, [
    new RegExp(`(?:^|\\n)\\s*PRIMA(?:\\s+TOTAL)?\\s*:?\\s*(?:\\$|ARS|USD)?\\s*${amount}(?:\\s|$)`, "im"),
    new RegExp(`PRIMA\\s+PERCEP\\.\\s+IVA[\\s\\S]{0,180}?\\$\\s*${amount}`, "i"),
    new RegExp(`FRENTE DE P[ÓO]LIZA\\s*\\n\\s*${amount}\\s*\\$?\\s*\\n\\s*0[.,]00`, "i"),
  ]);
  let premioRaw = firstMatch(text, [
    new RegExp(`(?:^|\\n)\\s*PREMIO(?:\\s+(?:TOTAL|DEL ENDOSO|DEL PER[IÍ]ODO))?\\s*:?\\s*(?:\\$|ARS|USD)?\\s*${amount}(?:\\s|$)`, "im"),
    new RegExp(`MONEDA\\s+PREMIO\\s+MEDIO DE PAGO[\\s\\S]{0,180}?(?:PESOS|ARS)\\s+\\$\\s*${amount}`, "i"),
  ]);

  const financialLabels = text.search(/MONEDA\s+PRIMA\s+REC\.\s*FINANCIERO\s+SUB\s*TOTAL/i);
  if ((!primaRaw || !premioRaw) && financialLabels >= 0) {
    const precedingLines = text.slice(Math.max(0, financialLabels - 700), financialLabels).split("\n").slice(-8);
    const numericRows = precedingLines
      .map((line) => {
        const values = Array.from(line.matchAll(/[0-9][0-9.]*,[0-9]{2}/g)).map((match) => match[0]);
        const residue = line.replace(/[0-9][0-9.]*,[0-9]{2}/g, "").replace(/[$\s]/g, "");
        return residue ? [] : values;
      })
      .filter((values) => values.length);
    const firstRow = numericRows.find((values) => values.length >= 3);
    const numericValues = numericRows.flat().map((value) => ({ raw: value, parsed: parseArgentineAmount(value) || 0 }));
    if (!primaRaw && firstRow) primaRaw = firstRow[0];
    if (!premioRaw && numericValues.length) premioRaw = numericValues.sort((a, b) => b.parsed - a.parsed)[0].raw;
  }

  const moneda = /MONEDA(?:\s+CONTRATO)?[\s\S]{0,120}\b(?:PESOS|ARS)\b|P[ÓO]LIZA\s+SE\s+EMITE\s+EN\s+PESOS/i.test(text)
    ? "ARS"
    : /MONEDA(?:\s+CONTRATO)?[\s\S]{0,80}\b(?:USD|U\$S|D[ÓO]LARES)\b/i.test(text) ? "USD" : "ARS";
  return {
    prima: primaRaw ? parseArgentineAmount(primaRaw) : undefined,
    premioTotal: premioRaw ? parseArgentineAmount(premioRaw) : undefined,
    moneda,
  };
}

function detectRiskData(text: string): Pick<PolicyImportData, "cobertura" | "patente" | "chasis" | "motor" | "direccionRiesgo"> {
  const policyPlan = firstMatch(text, [
    /T[eé]rmino \(en d[ií]as\) Plan\s*\n\s*\d+\s+([^\n]{3,160})/i,
  ]);
  const coverageFront = text.slice(0, 8000);
  const documentCoverage = /\bSEGURO DE HOGAR\b/i.test(coverageFront)
    ? "Seguro de Hogar - Incendio, contenido y responsabilidad civil"
    : /\bCombinado Familiar\b/i.test(coverageFront)
      ? (/DESCRIPCI[ÓO]N DEL RIESGO ASEGURADO\s*\n\s*([^\n]+)/i.exec(text)?.[1]
        ? `Combinado Familiar - ${cleanLine(/DESCRIPCI[ÓO]N DEL RIESGO ASEGURADO\s*\n\s*([^\n]+)/i.exec(text)![1])}`
        : "Combinado Familiar")
      : /\bSEGURO OBLIGATORIO AUTOMOTOR\b/i.test(coverageFront)
        ? "Responsabilidad Civil - Seguro obligatorio automotor"
        : /\bACCIDENTES PERSONALES\b/i.test(text.slice(0, 4000))
          ? (/TRABAJOS EN ALTURA/i.test(text.slice(0, 8000)) ? "Accidentes personales - Trabajos en altura" : "Accidentes personales")
          : undefined;
  let cobertura = policyPlan || documentCoverage || firstMatch(text, [
    /(?:^|\n)\s*COBERTURA\s*:\s*([^\n]{3,180})/im,
    /(?:^|\n)\s*TIPO DE COBERTURA\s*:\s*([^\n]{3,180})/im,
  ]);
  if (!cobertura || /^(?:suma asegurada|ver anexo)/i.test(cobertura)) {
    cobertura = documentCoverage;
  }
  cobertura = cobertura ? cleanLine(cobertura).slice(0, 180) : undefined;

  let patente = firstMatch(text, [
    /(?:^|\n)[^\n]{0,100}\b(?:PATENTE|DOMINIO)\s*:?\s*\b([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|[A-Z]{3}\d{3})\b/im,
    /\bRiesgo\s*:\s*Pat\.?\s*([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|[A-Z]{3}\d{3})\b/i,
  ])?.replace(/\s+/g, "").toUpperCase();

  const assetText = text.slice(0, 8000);
  const assetValue = (label: string): string | undefined => {
    const match = assetText.match(new RegExp(`(?:^|\\n)[^\\n]{0,80}\\b${label}\\s*:?\\s*([^\\n]{5,50})`, "im"));
    if (!match?.[1]) return undefined;
    return cleanLine(match[1].split(/\s+(?:CHASIS|CHASSIS|VIN|MOTOR|A[ÑN]O|PATENTE|DOMINIO|FORMA DE COBRO)\s*:?/i)[0]).toUpperCase();
  };
  let chasis = assetValue("(?:CHASIS|CHASSIS|VIN|CARROCER[IÍ]A)");
  let motor = assetValue("MOTOR");
  if (chasis && !/^[A-Z0-9*]{8,25}$/.test(chasis)) chasis = undefined;
  if (motor && (!/^[A-Z0-9* -]{6,25}$/.test(motor) || /\b(?:CONFORME|INTERNA|GENERADOR|RIESGO)\b/.test(motor))) motor = undefined;

  const certificateVehicle = text.match(/(?:^|\n)\s*([A-Z0-9]{3}\s+[A-Z0-9]{5,})\s*\/\s*([A-Z0-9]{12,25})\s+([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|[A-Z]{3}\d{3})\s*\n/im);
  if (!motor && certificateVehicle) motor = cleanLine(certificateVehicle[1]).toUpperCase();
  if (!chasis && certificateVehicle) chasis = certificateVehicle[2].toUpperCase();
  if (!patente && certificateVehicle) patente = certificateVehicle[3].toUpperCase();

  const direccionRiesgo = cleanAddress(firstMatch(text, [
    /(?:^|\n)\s*(?:direcci[oó]n del riesgo|ubicaci[oó]n del riesgo|riesgo ubicado en|descripci[oó]n riesgo)\s*:?\s*\n?\s*([^\n]{5,140})/im,
  ]));
  return { cobertura, patente, chasis, motor, direccionRiesgo };
}

function detectInstallments(text: string, premioTotal?: number): ExtractedInstallment[] {
  const installments: ExtractedInstallment[] = [];
  const add = (dateRaw?: string, amountRaw?: string) => {
    const vencimiento = dateRaw ? parsePolicyDate(dateRaw) : undefined;
    const importe = amountRaw ? parseArgentineAmount(amountRaw) : undefined;
    if (!vencimiento || installments.some((item) => item.vencimiento === vencimiento && item.importe === importe)) return;
    installments.push({ numero: installments.length + 1, vencimiento, importe });
  };

  const bbva = text.match(/MONEDA\s+PREMIO\s+MEDIO DE PAGO[\s\S]{0,220}?(?:PESOS|ARS)\s+\$\s*[0-9][0-9.,]*[.,][0-9]{2}[\s\S]{0,120}?\d+\s+\$\s*([0-9][0-9.,]*[.,][0-9]{2})\s*\n\s*VENCIMIENTOS\s*\n\s*(\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))/i);
  if (bbva) add(bbva[2], bbva[1]);

  const singleEndorsement = text.match(/TOTAL\s*:\s*([0-9][0-9.,]*[.,][0-9]{2})\s*\n\s*(\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))\s+([0-9][0-9.,]*[.,][0-9]{2})\s+1\/1/i);
  if (singleEndorsement) add(singleEndorsement[2], singleEndorsement[3]);

  for (const line of text.split("\n").filter((value) => /vencimiento|cuotas?/i.test(value))) {
    for (const match of line.matchAll(/(?<!\d)(\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))(?!\d)[^\n]{0,45}?(?:\$|ARS|PESOS)\s*([0-9][0-9.,]*[.,][0-9]{2})/gi)) {
      add(match[1], match[2]);
    }
  }

  if (!installments.length) {
    const labelIndex = text.search(/C[ÓO]D\.\s*PAGOS[\s\S]{0,60}VENCIMIENTO\s+1[°º]\s+CUOTA/i);
    if (labelIndex >= 0) {
      const before = text.slice(Math.max(0, labelIndex - 180), labelIndex);
      const dates = Array.from(before.matchAll(/(?<!\d)(\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))(?!\d)/g));
      add(dates.at(-1)?.[1], premioTotal ? String(premioTotal) : undefined);
    }
  }

  return installments.slice(0, 24);
}

function detectPaymentMethod(text: string): PolicyImportData["medioPago"] {
  const front = normalize(text.slice(0, 12000));
  if (/visa credito|mastercard|debito en tarjeta|tarjeta de credito/.test(front)) return "Tarjeta de credito";
  if (/banco caja de ahorro|debito automatico|c\.b\.u\.|\bcbu\b/.test(front)) return "Debito por CBU";
  return "Cupon";
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
    medioPago: detectPaymentMethod(text),
    porcentajeComision: 15,
  };
  data.cuotas = detectInstallments(text, data.premioTotal);
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
