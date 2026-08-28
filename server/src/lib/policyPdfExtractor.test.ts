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

test("lee el frente invertido de La Equidad sin confundir encabezados ni texto contractual", () => {
  const text = `
    Entre LA EQUIDAD SOCIAL COMPAÑIA DE SEGUROS PATRIMONIALES S.A, en adelante el Asegurador.
    Desde las 12:00 Hs. del 18/08/2026
    Hasta las 12:00 Hs. del 18/11/2026
    0 137101
    VIGENCIA PÓLIZA Nº ENDOSO Nº SECCIÓN
    AUTOMOTORES
    CUIL/CUIT
    BUENOS AIRES
    BRIAN RUBEN CEFERINO FERRAS
    PANAMA 1216
    20415499311 1842-EL JAGUEL
    Tel.: 1165696932
    ASEGURADO:
    Domicilio
    187.463,43 0,00 187.463,43
    0,00 2.249,56 2.062,10 39.367,32 0,00 233.017,04 0,00
    $ 1.874,63
    INT. + SELL. T.SUP. + S.S. I.V.A. (*) R.G. 3337 IVA RFI I.BRUTOS Ley 26363
    MONEDA PRIMA REC. FINANCIERO SUB TOTAL
    PREMIO
    COBERTURA: CL C LES RESPONSABILIDAD CIVIL Y ROBO
    PATENTE: NLT666 MOTOR: 10DBSR0115461 CHASIS: 8AD2MKFWMEG041633
    23/08/2026
    CÓD. PAGOS LINK/BANELCO VENCIMIENTO 1° CUOTA FORMA DE PAGO
  `;
  const result = extractPolicyDataFromText(text);
  assert.equal(result.data.numeroPoliza, "137101");
  assert.equal(result.data.endoso, "0");
  assert.equal(result.data.clienteNombre, "BRIAN RUBEN CEFERINO FERRAS");
  assert.equal(result.data.clienteDni, "20415499311");
  assert.equal(result.data.aseguradora, "La Equidad Social Compañía de Seguros Patrimoniales S.A.");
  assert.equal(result.data.prima, 187463.43);
  assert.equal(result.data.premioTotal, 233017.04);
  assert.equal(result.data.patente, "NLT666");
  assert.equal(result.data.fechaInicio, "2026-08-18");
});

test("lee pólizas BBVA de hogar con vigencia anual y evita Automóviles por la palabra automático", () => {
  const text = `
    TOMADOR LUGAR Y FECHA DE EMISION
    PATRICIO FAHEY
    CUIL 20291164529
    ALBERTO GRANDE 757 0 0
    SEGURO DE HOGAR
    POLIZA Nº 3181929
    Compañía Aseguradora: BBVA SEGUROS ARGENTINA S.A.
    PRIMA PERCEP. IVA REC. FINANCIEROS IVA SELLADO IMPUESTOS/TASAS II.BB.
    $ 2.861,08 $ 0,00 $ 0,00 $ 600,83 $ 34,33 $ 34,34 $ 0,00
    MONEDA PREMIO MEDIO DE PAGO FACTURACIÓN CUOTAS IMPORTE CUOTA
    PESOS $ 3.530,58 BANCO CAJA DE AHORRO MENSUAL 1 $ 3.530,58
    VENCIMIENTOS
    01/09/2025
    Vigencia de póliza
    Desde el 06/08/2025 Hasta el 06/08/2026
    Descripcion Riesgo
    ALBERTO GRANDE 757 0 0 - (1838) GUILLON Pcia. BS AS - ARGENTINA
    PRÓRROGA AUTOMÁTICA DE VIGENCIA
  `;
  const result = extractPolicyDataFromText(text);
  assert.equal(result.data.rubro, "Hogar");
  assert.equal(result.data.fechaInicio, "2025-08-06");
  assert.equal(result.data.fechaVencimiento, "2026-08-06");
  assert.equal(result.data.prima, 2861.08);
  assert.equal(result.data.premioTotal, 3530.58);
  assert.equal(result.data.medioPago, "Debito por CBU");
  assert.deepEqual(result.data.cuotas, [{ numero: 1, vencimiento: "2025-09-01", importe: 3530.58 }]);
});

test("prioriza el endoso vigente de Federación Patronal y su plan de cobertura", () => {
  const text = `
    SECCIÓN AUTOMOTORES PÓLIZA 35185713
    ASEGURADO: 6815954 FLORENTIN SERGIO DANIEL
    CUIT/CUIL: 20302372064 DNI: 30237206 Domicilio: MAR CHIQUITA N* 36
    FEDERACIÓN PATRONAL SEGUROS S.A.U.
    Vigencia Desde Vigencia Hasta
    Desde 12:00 Hs. del 20-08-2026 Hasta 12:00 Hs. del 20-02-2027
    Término (en días) Plan
    184 CF - RC.PT Ac. y P.TyP Inc. y Robo FULL
    Endoso Lugar de emisión
    6 La Plata
    TOTAL: 103,288.84
    23-08-2026 103,288.84 1/1
    LIQUIDACION DEL PREMIO
    PREMIO DEL ENDOSO
    103,288.84
    FRENTE DE PÓLIZA
    82,911.50 $
    0.00 $
    PCU657 CFZ P28718 / 8AWPB45Z3GA500786 PCU657
  `;
  const result = extractPolicyDataFromText(text);
  assert.equal(result.data.endoso, "6");
  assert.equal(result.data.cobertura, "CF - RC.PT Ac. y P.TyP Inc. y Robo FULL");
  assert.equal(result.data.prima, 82911.5);
  assert.equal(result.data.premioTotal, 103288.84);
  assert.equal(result.data.rubro, "Automoviles");
  assert.equal(result.data.clienteNombre, "FLORENTIN SERGIO DANIEL");
});

test("prioriza a Experta sobre aseguradoras representantes del certificado Mercosur", () => {
  const text = `
    Asegurado BRIZUELA ROMUALDO
    N° de póliza 037833410
    Tipo y N° de Documento 28610025
    Inicio de vigencia del seguro 01-11-2025
    Dominio PNA963
    Carrocería 8AP17177NG3076447
    Motor 310A20112694119
    SEGURO OBLIGATORIO AUTOMOTOR
    Los seguros son emitidos por EXPERTA SEGUROS S.A.U.
    DIRECCIONES DE ASEGURADORAS REPRESENTANTES
    URUGUAY HDI Seguros S.A.
    Desde el 01-08-2026 hasta el 01-10-2026
  `;
  const result = extractPolicyDataFromText(text);
  assert.equal(result.data.aseguradora, "Experta Seguros S.A.U.");
  assert.equal(result.data.rubro, "Automoviles");
  assert.equal(result.data.cobertura, "Responsabilidad Civil - Seguro obligatorio automotor");
  assert.equal(result.data.chasis, "8AP17177NG3076447");
  assert.equal(result.data.fechaInicio, "2026-08-01");
  assert.equal(result.data.fechaVencimiento, "2026-10-01");
});
