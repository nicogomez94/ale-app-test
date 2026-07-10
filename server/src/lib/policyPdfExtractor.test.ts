import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPolicyDataFromText,
  mapRamoToRubro,
  parseArgentineAmount,
  parsePolicyDate,
} from "./policyPdfExtractor.js";

test("parsea importes argentinos con miles y centavos", () => {
  assert.equal(parseArgentineAmount("$193.110,26"), 193110.26);
  assert.equal(parseArgentineAmount("240.229"), 240229);
  assert.equal(parseArgentineAmount("12,50"), 12.5);
});

test("parsea fechas de póliza en formato dd/mm/yyyy", () => {
  assert.equal(parsePolicyDate("23/05/2026"), "2026-05-23");
  assert.equal(parsePolicyDate("28-07-26"), "2026-07-28");
  assert.equal(parsePolicyDate("99/05/2026"), undefined);
});

test("detecta póliza, endoso, vigencia, asegurado y montos desde texto", () => {
  const text = `
    La Equidad Seguros
    Ramo / sección: Automotores
    Póliza / endoso: 115256 / 746963
    Vigencia Desde 23/05/2026 hasta 23/08/2026
    Asegurado: Carmen Mabel Martinez
    CUIL/CUIT: 27357634968
    Cobertura: Responsabilidad Civil + Robo Total
    Vehículo Ford Ka 1.0 Fly Plus año 2011 Patente KSF678
    Motor: CBR1C366065 Chasis: 9BFZK53B0CB366065
    Prima: $193.110,26
    Premio: $240.229,15
    Cuotas con vencimientos e importes: 28/05/2026 $80.076,38 28/06/2026 $80.076,38 28/07/2026 $80.076,39
  `;

  const result = extractPolicyDataFromText(text);
  assert.equal(result.data.aseguradora, "La Equidad Seguros");
  assert.equal(result.data.rubro, "Automoviles");
  assert.equal(result.data.numeroPoliza, "115256");
  assert.equal(result.data.endoso, "746963");
  assert.equal(result.data.fechaInicio, "2026-05-23");
  assert.equal(result.data.fechaVencimiento, "2026-08-23");
  assert.equal(result.data.clienteNombre, "Carmen Mabel Martinez");
  assert.equal(result.data.clienteDni, "27357634968");
  assert.equal(result.data.prima, 193110.26);
  assert.equal(result.data.premioTotal, 240229.15);
  assert.equal(result.data.patente, "KSF678");
  assert.equal(result.data.motor, "CBR1C366065");
  assert.equal(result.data.chasis, "9BFZK53B0CB366065");
  assert.deepEqual(result.missingFields, []);
  assert.ok((result.data.cuotas || []).length >= 3);
});

test("mapea ramo a rubro del sistema", () => {
  assert.equal(mapRamoToRubro("Sección: Automotores"), "Automoviles");
  assert.equal(mapRamoToRubro("Producto: Integral de comercio"), "Integral de comercio");
  assert.equal(mapRamoToRubro("Seguro de caución"), "Caucion");
});

test("reporta campos faltantes cuando el texto no trae datos obligatorios", () => {
  const result = extractPolicyDataFromText("PDF escaneado sin texto útil");
  assert.ok(result.missingFields.includes("Número de póliza"));
  assert.ok(result.missingFields.includes("Prima o premio total"));
  assert.ok(result.warnings.some((warning) => warning.includes("completá los datos manualmente")));
});
