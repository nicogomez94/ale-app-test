import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageBreak,
  LevelFormat,
  NumberFormat,
  convertInchesToTwip,
  UnderlineType,
  VerticalAlign,
  ImageRun,
} from 'docx';
import fs from 'fs';

// ─── Colores de marca ──────────────────────────────────────────────────────────
const C_PRIMARY   = '1E3A5F';   // Azul marino
const C_ACCENT    = '2563EB';   // Azul eléctrico
const C_SUCCESS   = '10B981';   // Verde
const C_WARNING   = 'F59E0B';   // Ámbar
const C_DANGER    = 'EF4444';   // Rojo
const C_LIGHTBG   = 'EFF6FF';   // Azul muy claro (fondo)
const C_DARKBG    = '1E3A5F';   // Azul marino (fondo header)
const C_WHITE     = 'FFFFFF';
const C_GRAY      = '64748B';
const C_BORDER    = 'CBD5E1';
const C_TABLE_ALT = 'F8FAFC';

// ─── Helpers de tipografía ─────────────────────────────────────────────────────
const font = 'Calibri';

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 160 },
  children: [
    new TextRun({
      text,
      font,
      size: 36,
      bold: true,
      color: C_PRIMARY,
    }),
  ],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 360, after: 120 },
  border: { bottom: { color: C_ACCENT, size: 4, style: BorderStyle.SINGLE } },
  children: [
    new TextRun({
      text,
      font,
      size: 28,
      bold: true,
      color: C_ACCENT,
    }),
  ],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 80 },
  children: [
    new TextRun({
      text,
      font,
      size: 22,
      bold: true,
      color: C_PRIMARY,
    }),
  ],
});

const h4 = (text) => new Paragraph({
  spacing: { before: 160, after: 60 },
  children: [
    new TextRun({
      text: `▸ ${text}`,
      font,
      size: 20,
      bold: true,
      color: C_ACCENT,
    }),
  ],
});

const body = (text, { bold = false, color = '000000', italic = false } = {}) => new Paragraph({
  spacing: { before: 40, after: 80 },
  children: [
    new TextRun({ text, font, size: 20, bold, color, italic }),
  ],
});

const bullet = (text, level = 0) => new Paragraph({
  spacing: { before: 40, after: 40 },
  indent: { left: convertInchesToTwip(0.3 + level * 0.3), hanging: convertInchesToTwip(0.2) },
  children: [
    new TextRun({ text: `• ${text}`, font, size: 20, color: '1E293B' }),
  ],
});

const note = (text) => new Paragraph({
  spacing: { before: 80, after: 80 },
  shading: { type: ShadingType.CLEAR, fill: C_LIGHTBG },
  border: { left: { color: C_ACCENT, size: 8, style: BorderStyle.SINGLE } },
  indent: { left: convertInchesToTwip(0.2) },
  children: [
    new TextRun({ text: `💡 ${text}`, font, size: 18, color: '334155', italic: true }),
  ],
});

const spacer = (n = 1) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun('')] }));

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ─── Tabla con encabezado ──────────────────────────────────────────────────────
const makeTable = (headers, rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 2, color: C_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: C_BORDER },
    left:   { style: BorderStyle.SINGLE, size: 2, color: C_BORDER },
    right:  { style: BorderStyle.SINGLE, size: 2, color: C_BORDER },
    insideH:{ style: BorderStyle.SINGLE, size: 1, color: C_BORDER },
    insideV:{ style: BorderStyle.SINGLE, size: 1, color: C_BORDER },
  },
  rows: [
    new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C_DARKBG },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, font, size: 18, bold: true, color: C_WHITE })],
        })],
      })),
    }),
    ...rows.map((row, i) => new TableRow({
      children: row.map(cell => new TableCell({
        shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? C_WHITE : C_TABLE_ALT },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: cell, font, size: 18, color: '1E293B' })],
        })],
      })),
    })),
  ],
});

// ─── TÍTULO DE PORTADA ─────────────────────────────────────────────────────────
const coverPage = [
  new Paragraph({
    spacing: { before: 2200, after: 200 },
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.CLEAR, fill: C_DARKBG },
    children: [new TextRun({ text: 'PAS ALERT', font, size: 72, bold: true, color: C_WHITE })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: 'Sistema de Gestión para Productores Asesores de Seguros', font, size: 30, color: 'BFD7FF', italic: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
    children: [new TextRun({ text: 'Sistema Pro — $200.000', font, size: 24, bold: true, color: C_WARNING })],
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '─────────────────────────────────────', font, size: 20, color: '334155' })] }),
  new Paragraph({ spacing: { before: 80, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Documento de Alcance — Módulos Incluidos', font, size: 24, bold: true, color: C_ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Preparado por ZIGO DEV   |   Abril 2026', font, size: 20, color: C_GRAY })] }),
  pageBreak(),
];

// ─── ÍNDICE ───────────────────────────────────────────────────────────────────
const indexPage = [
  h1('Índice de Contenidos'),
  ...['1. Introducción y Resumen Ejecutivo', '2. Módulo de Siniestros', '3. Módulo de Cotizaciones + Página Pública', '4. Directorio de Aseguradoras y Brokers', '5. Facturación de Comisiones Detallada', '6. Login Google / Multi-moneda / Caución', '7. Gestión de Cuotas y Renovación Automática', '8. Módulos Base del Sistema', '9. Propuesta de Implementación por Etapas', '10. Nota Final'].map(item => bullet(item)),
  pageBreak(),
];

// ─── SECCIÓN 1: INTRODUCCIÓN ──────────────────────────────────────────────────
const section1 = [
  h1('1. Introducción y Resumen Ejecutivo'),
  body('PAS Alert es un sistema web de gestión integral diseñado exclusivamente para Productores Asesores de Seguros (PAS) en Argentina. Permite centralizar y automatizar todas las operaciones del negocio asegurador: desde la administración de pólizas y clientes hasta la gestión de siniestros, cotizaciones, comisiones y facturación.'),
  body('Este documento detalla los módulos que conforman el Sistema Pro contratado, describiendo funcionalmente cada pantalla, flujo de trabajo y regla de negocio implementada.'),
  ...spacer(1),
  h2('Resumen de Módulos Incluidos'),
  makeTable(
    ['Módulo', 'Descripción Corta', 'Estado'],
    [
      ['Módulo de Siniestros',            'Gestión completa de reclamos/claims',              'INCLUIDO ✓'],
      ['Cotizaciones + Página Pública',   'Cotizador compartible sin login',                  'INCLUIDO ✓'],
      ['Directorio Aseguradoras/Brokers', 'Datos fiscales, credenciales y brokers',           'INCLUIDO ✓'],
      ['Facturación de Comisiones',       'Facturas por aseguradora, estados, documentos',    'INCLUIDO ✓'],
      ['Login Google / Multi-moneda / Caución', 'Autenticación, divisas y pólizas de caución', 'INCLUIDO ✓'],
      ['Gestión de Cuotas y Renovación',  'Póliza siguiente auto-generada al marcar pagada',  'INCLUIDO ✓'],
    ]
  ),
  pageBreak(),
];

// ─── SECCIÓN 2: SINIESTROS ────────────────────────────────────────────────────
const section2 = [
  h1('2. Módulo de Siniestros'),
  body('Este módulo permite al productor registrar, hacer seguimiento y cerrar todos los siniestros/reclamos vinculados a sus pólizas de manera sistemática. Reemplaza el manejo por mail, cuadernos o planillas dispersas.'),

  h2('2.1 Panel Principal de Siniestros'),
  body('Al ingresar a la sección Siniestros, el productor visualiza:'),
  bullet('Tabla resumen con todos los siniestros activos e históricos, ordenados por fecha.'),
  bullet('Columnas: N° de siniestro, cliente, aseguradora, tipo de seguro, fecha del siniestro, estado y prioridad.'),
  bullet('Barra de búsqueda en tiempo real para filtrar por cualquier campo.'),
  bullet('Filtros combinados por Estado (Denunciado, En gestión, En inspección, En análisis, Aprobado, Rechazado, Pagado) y Prioridad (Alta, Media, Baja).'),
  bullet('KPIs en tarjetas superiores: total de siniestros, siniestros activos, importe reclamado total e importe pagado total.'),
  bullet('Exportación de la tabla completa a Excel (.xlsx) con un clic.'),
  ...spacer(1),

  h2('2.2 Alta de Siniestro'),
  body('El formulario de nuevo siniestro captura todos los datos necesarios para iniciar la gestión:'),
  bullet('Datos del siniestro: número de siniestro, número de póliza, aseguradora, tipo de seguro.'),
  bullet('Datos del cliente: nombre y DNI (con autocompletado desde la base de clientes existente).'),
  bullet('Datos del hecho: fecha, hora y lugar del siniestro, descripción detallada.'),
  bullet('Campos dinámicos según rubro: para Automotor se despliegan campos adicionales (patente, marca/modelo del vehículo involucrado); para Hogar se agrega tipo de daño; etc.'),
  bullet('Estado inicial configurable (por defecto: "Denunciado") y responsable interno asignado.'),
  bullet('Montos: importe reclamado, deducible aplicable y monto aprobado.'),
  ...spacer(1),

  h2('2.3 Estados del Siniestro y Flujo de Trabajo'),
  body('Cada siniestro atraviesa un ciclo de vida con 7 estados posibles:'),
  makeTable(
    ['Estado', 'Descripción', 'Color en sistema'],
    [
      ['Denunciado',     'Recién ingresado, pendiente de inicio de gestión', 'Azul'],
      ['En gestión',     'El productor está realizando acciones activas',    'Ámbar'],
      ['En inspección',  'La aseguradora envió un inspector al terreno',     'Violeta'],
      ['En análisis',    'La aseguradora analiza la documentación',          'Índigo'],
      ['Aprobado',       'Siniestro habilitado para liquidación',            'Verde'],
      ['Rechazado',      'La aseguradora denegó la cobertura',              'Rojo'],
      ['Pagado',         'El cliente recibió la indemnización',             'Verde oscuro'],
    ]
  ),
  ...spacer(1),

  h2('2.4 Prioridad Automática'),
  body('El sistema calcula la prioridad del siniestro de forma automática sin intervención manual, basándose en dos criterios:'),
  bullet('Prioridad Alta: importe reclamado mayor a $500.000, o más de 10 días sin actualización.'),
  bullet('Prioridad Media: importe reclamado mayor a $100.000, o más de 5 días sin actualización.'),
  bullet('Prioridad Baja: los demás casos.'),
  note('La prioridad se recalcula automáticamente cada vez que se edita el siniestro, garantizando que el productor siempre tenga identificados los casos urgentes.'),
  ...spacer(1),

  h2('2.5 Vista Detalle del Siniestro'),
  body('Al hacer clic en cualquier siniestro se abre un panel lateral con la ficha completa:'),
  bullet('Todos los datos del formulario de alta, editables.'),
  bullet('Historial de notas internas: el productor puede añadir notas con texto libre, que quedan registradas con fecha y hora.'),
  bullet('Registro de último contacto con la aseguradora y con el cliente (fecha de cada interacción).'),
  bullet('Sección de documentos adjuntos: el productor puede referenciar documentos vinculados al siniestro.'),
  bullet('Progreso visual del estado con barra de avance.'),
  ...spacer(1),

  h2('2.6 Indicadores y KPIs del Módulo'),
  makeTable(
    ['Indicador', 'Descripción'],
    [
      ['Total Siniestros',       'Cantidad total de siniestros registrados'],
      ['Siniestros Activos',     'Siniestros en estados que no sean Pagado o Rechazado'],
      ['Monto Reclamado Total',  'Suma de todos los importes reclamados'],
      ['Monto Pagado Total',     'Suma de todos los importes efectivamente pagados'],
    ]
  ),
  pageBreak(),
];

// ─── SECCIÓN 3: COTIZACIONES ──────────────────────────────────────────────────
const section3 = [
  h1('3. Módulo de Cotizaciones + Página Pública'),
  body('Este módulo combina un gestor interno de solicitudes de cotización con un formulario público que el productor puede compartir con sus clientes o prospectos sin que estos necesiten crear una cuenta.'),

  h2('3.1 Gestor Interno de Cotizaciones'),
  body('El panel de cotizaciones permite al productor ver y administrar todas las solicitudes recibidas:'),
  bullet('Lista de cotizaciones con filtros por tipo de seguro (Auto, Moto, Hogar, Otros) y búsqueda por nombre/patente/datos del cliente.'),
  bullet('Columnas: nombre del solicitante, tipo de seguro, datos del riesgo, fecha de solicitud, origen (Carga manual / Link público).'),
  bullet('Alta manual de cotización desde el sistema (mismo formulario que el público, pero accesible desde adentro).'),
  bullet('Edición y eliminación de cotizaciones existentes.'),
  bullet('Exportación a Excel del listado completo.'),
  ...spacer(1),

  h2('3.2 Formulario de Cotización — Campos por Tipo de Seguro'),
  body('El formulario adapta sus campos dinámicamente según el tipo de seguro seleccionado:'),

  h3('Auto / Moto'),
  bullet('Datos personales: nombre y apellido, CUIT/CUIL, fecha de nacimiento, email, celular.'),
  bullet('Datos del vehículo: marca, modelo, año, patente, tipo de uso (Particular / Comercial).'),
  bullet('Equipamiento: si tiene GNC instalado (Sí/No), si tiene rastreador GPS (Sí/No).'),
  bullet('Forma de pago preferida (Débito por CBU / Tarjeta / Cupón).'),
  bullet('Dirección completa: calle, CP, localidad, provincia (con selector de las 24 provincias argentinas).'),

  h3('Hogar'),
  bullet('Datos personales completos (ídem Auto).'),
  bullet('Tipo de vivienda (Casa / Departamento / PH / Otro).'),
  bullet('Superficie cubierta en m².'),

  h3('Otros / Genérico'),
  bullet('Datos personales completos.'),
  bullet('Campo de texto libre para describir el bien o riesgo a asegurar.'),
  ...spacer(1),

  h2('3.3 Página Pública de Cotización (sin login)'),
  body('Cada productor posee una URL única con su identificador que puede compartir por WhatsApp, redes sociales, email o imprimir en un folleto. El cliente accede, completa el formulario y al enviar:'),
  bullet('Los datos se guardan automáticamente en el sistema del productor.'),
  bullet('El cliente ve una pantalla de confirmación: "¡Solicitud Enviada! Un productor de seguros se pondrá en contacto contigo a la brevedad."'),
  bullet('El productor visualiza la solicitud en su panel marcada con origen "Public Link".'),
  note('La URL puede generarse con tipo pre-seleccionado: /cotizar/:userId/auto muestra el formulario de Auto directamente, reduciendo fricción para el cliente.'),
  ...spacer(1),

  h2('3.4 Compartir Cotización — QR y Enlace'),
  body('Desde el gestor interno, el productor puede:'),
  bullet('Copiar el link público al portapapeles con un clic.'),
  bullet('Generar un código QR imprimible para cada tipo de seguro.'),
  bullet('El QR puede pegarse en tarjetas de presentación, folletos y stands.'),
  pageBreak(),
];

// ─── SECCIÓN 4: ASEGURADORAS Y BROKERS ───────────────────────────────────────
const section4 = [
  h1('4. Directorio de Aseguradoras y Brokers'),
  body('Directorio centralizado con dos pestañas: una para las aseguradoras con las que trabaja el productor y otra para los brokers/organizaciones intermediarias.'),

  h2('4.1 Pestaña — Aseguradoras'),
  body('Para cada aseguradora el sistema almacena:'),
  bullet('Razón social y CUIT.'),
  bullet('Domicilio comercial.'),
  bullet('Condición ante el IVA (Responsable Inscripto / Monotributo / Consumidor Final / Exento).'),
  bullet('Email de contacto y número de teléfono.'),
  bullet('URL del sitio web oficial.'),
  bullet('Credenciales de acceso al portal de la aseguradora (usuario y contraseña, almacenados de forma local y privada).'),
  bullet('Código de cliente/productor asignado por la aseguradora.'),
  bullet('Notas libres adicionales.'),
  ...spacer(1),
  body('Las filas de la tabla son expandibles: al hacer clic en una aseguradora se despliega un panel con todos sus datos detallados y el resumen de facturación de comisiones asociada.'),
  body('Totales visibles en tarjetas superiores: total facturado en ARS, total facturado en USD y cantidad de facturas emitidas.'),
  ...spacer(1),

  h2('4.2 Pestaña — Brokers / Organizaciones'),
  body('Un broker u organización puede representar a varias aseguradoras. El directorio de brokers permite:'),
  bullet('Nombre del broker u organización.'),
  bullet('Color identificatorio (selector de 8 colores predefinidos para identificación visual rápida).'),
  bullet('Aseguradoras vinculadas: el productor selecciona qué aseguradoras trabajan bajo ese broker.'),
  bullet('Contacto principal (nombre y apellido).'),
  bullet('Email del broker.'),
  ...spacer(1),

  h2('4.3 Filtros y Búsqueda'),
  bullet('Buscador por razón social o CUIT.'),
  bullet('Alta, edición y eliminación de aseguradoras y brokers desde la misma pantalla.'),
  pageBreak(),
];

// ─── SECCIÓN 5: FACTURACIÓN DE COMISIONES ─────────────────────────────────────
const section5 = [
  h1('5. Facturación de Comisiones Detallada'),
  body('El productor de seguros cobra comisiones de las aseguradoras. Este módulo le permite llevar un registro preciso de cada factura emitida, el estado de cobro y las diferencias detectadas entre lo esperado y lo efectivamente cobrado.'),

  h2('5.1 Lista General de Facturas'),
  body('Vista unificada con todas las facturas de comisiones de todas las aseguradoras:'),
  bullet('Columnas: aseguradora, período, número de factura, fecha de emisión, estado, monto, moneda, vencimiento.'),
  bullet('Buscador por nombre de aseguradora, período o número de factura.'),
  bullet('Ordenamiento por fecha de emisión (más reciente primero).'),
  ...spacer(1),

  h2('5.2 Estados de una Factura de Comisión'),
  makeTable(
    ['Estado', 'Significado'],
    [
      ['Pendiente',   'Factura emitida, pendiente de cobro'],
      ['Facturada',   'Factura enviada formalmente a la aseguradora'],
      ['Cobrada',     'Importe recibido en su totalidad'],
      ['Parcial',     'Se cobró una parte del importe; hay saldo pendiente'],
      ['Vencida',     'Superó la fecha de vencimiento sin cobrarse'],
    ]
  ),
  ...spacer(1),

  h2('5.3 Alta de Factura de Comisión'),
  body('El formulario de nueva factura registra:'),
  bullet('Aseguradora a la que corresponde (selector desplegable de las aseguradoras registradas).'),
  bullet('Período (mes y año en formato YYYY-MM).'),
  bullet('Número de factura.'),
  bullet('Monto facturado e indicador de moneda (ARS o USD).'),
  bullet('Estado inicial.'),
  body('La factura queda asociada a la aseguradora correspondiente y aparece tanto en la lista general como dentro del detalle expandible de esa aseguradora en el directorio.'),
  ...spacer(1),

  h2('5.4 Vinculación con Pólizas'),
  body('Cada factura de comisión puede vincularse con las pólizas que la originaron mediante el campo polizasIds, permitiendo:'),
  bullet('Trazabilidad de qué pólizas generaron cada comisión.'),
  bullet('Detección de diferencias: si el monto esperado (calculado desde las pólizas vinculadas) difiere del monto facturado, el sistema marca automáticamente el flag diferenciaDetectada.'),
  ...spacer(1),

  h2('5.5 Registro de Pagos Parciales'),
  body('Si la factura tiene estado "Parcial", el productor puede registrar múltiples pagos:'),
  bullet('Fecha del pago.'),
  bullet('Monto cobrado en esa cuota.'),
  bullet('Medio de pago utilizado.'),
  bullet('URL del comprobante de pago.'),
  note('El sistema acumula los montoCobrado sumando todos los pagos registrados, permitiendo ver en todo momento el saldo pendiente.'),
  pageBreak(),
];

// ─── SECCIÓN 6: LOGIN GOOGLE / MULTI-MONEDA / CAUCIÓN ─────────────────────────
const section6 = [
  h1('6. Login con Google / Multi-moneda / Caución'),
  body('Esta sección agrupa tres características transversales que enriquecen la experiencia del sistema sin estar confinadas a un único módulo.'),

  h2('6.1 Login con Google (OAuth 2.0)'),
  body('El sistema ofrece dos modalidades de autenticación:'),
  bullet('Email + contraseña: registro e inicio de sesión con credenciales propias.'),
  bullet('Inicio de sesión con Google: un clic vincula la cuenta de Gmail del productor vía Firebase Authentication + Google Provider. No requiere recordar contraseñas adicionales.'),
  ...spacer(1),
  body('Ambas modalidades comparten la misma base de datos y la sesión persiste de forma segura mediante tokens de Firebase (JWT). El logout cierra la sesión en todos los dispositivos.'),
  note('Para multi-usuario (agencia con varios productores), el sistema multi-cuenta está incluido en el plan Agencia.'),
  ...spacer(1),

  h2('6.2 Multi-moneda (ARS / USD / EUR / BRL)'),
  body('Todas las pólizas y facturas del sistema soportan múltiples monedas:'),
  bullet('Pólizas: el campo moneda acepta ARS, USD, EUR o BRL. La prima y los importes vinculados se almacenan en la moneda original.'),
  bullet('Comisiones: cada factura de comisión indica su moneda (ARS o USD), con totales separados por divisa en los KPIs.'),
  bullet('El sistema no realiza conversión automática de divisas; cada registro mantiene su moneda nativa para evitar inconsistencias contables.'),
  ...spacer(1),

  h2('6.3 Caución — Categoría de Seguro'),
  body('La categoría "Seguros Financieros" de la clasificación de rubros incluye Caución, Crédito y Garantías Contractuales como tipos de póliza válidos en el formulario de nueva póliza.'),
  body('Esto permite al productor gestionar pólizas de caución con las mismas herramientas que cualquier otro ramo:'),
  bullet('Registro con datos del tomador, beneficiario, monto garantizado y vigencia.'),
  bullet('Alertas de vencimiento estándar.'),
  bullet('Cálculo de comisión sobre la prima.'),
  bullet('Asociación con aseguradoras especializadas en garantías.'),
  pageBreak(),
];

// ─── SECCIÓN 7: CUOTAS Y RENOVACIÓN ──────────────────────────────────────────
const section7 = [
  h1('7. Gestión de Cuotas y Renovación Automática'),
  body('Este módulo maneja el ciclo de facturación periódica de las pólizas y la generación automática de la póliza siguiente al registrar el cobro de la última cuota.'),

  h2('7.1 Periodicidades Soportadas'),
  body('Al crear una póliza, el productor define la vigencia de facturación:'),
  makeTable(
    ['Vigencia', 'Cuotas generadas', 'Descripción'],
    [
      ['Mensual',    '1',  'Una póliza/cuota por mes'],
      ['Bimestral',  '2',  'Dos cuotas de 2 meses cada una'],
      ['Trimestral', '3',  'Tres cuotas de 3 meses cada una'],
      ['Semestral',  '6',  'Seis cuotas de un semestre cada una'],
      ['Anual',      '12', 'Doce cuotas de un año'],
    ]
  ),
  ...spacer(1),

  h2('7.2 Generación de Cuotas en Lote'),
  body('Al guardar una póliza con vigencia mayor a Mensual, el sistema genera automáticamente todas las cuotas del período:'),
  bullet('Cada cuota es una fila independiente en el dashboard con su número (ej. "3/6" = tercera cuota de seis).'),
  bullet('Todas las cuotas comparten el mismo groupId, permitiendo identificar que pertenecen al mismo contrato.'),
  bullet('Las fechas de inicio y vencimiento de cada cuota se calculan automáticamente en función de la vigencia.'),
  bullet('El estado inicial de cada cuota es "Activa" y pagada = false.'),
  ...spacer(1),

  h2('7.3 Registro de Pago y Renovación'),
  body('En el dashboard de pólizas, el productor puede marcar cada cuota como pagada desde la columna de acciones:'),
  bullet('Al marcar la última cuota de un grupo como pagada, el sistema genera automáticamente la siguiente póliza (renovación).'),
  bullet('La nueva póliza copia todos los datos de la póliza original, actualiza las fechas y la numera como cuota "1/N".'),
  bullet('El productor recibe una confirmación visual de la renovación generada.'),
  ...spacer(1),

  h2('7.4 Estados de Póliza y Alertas de Vencimiento'),
  body('Las pólizas tienen tres estados calculados automáticamente en función de la fecha de vencimiento:'),
  makeTable(
    ['Estado', 'Condición', 'Acción recomendada'],
    [
      ['Activa',        'Vence en más de 30 días',    'Seguimiento normal'],
      ['Vence pronto',  'Vence en menos de 30 días',  'Enviar recordatorio al cliente'],
      ['Vencida',       'Fecha de vencimiento pasada','Renovar o dar de baja'],
    ]
  ),
  ...spacer(1),

  h2('7.5 Integración con el Dashboard'),
  body('El dashboard principal muestra:'),
  bullet('Cantidad de pólizas activas, próximas a vencer y vencidas.'),
  bullet('Monto total de comisiones del mes (suma de comisionCalculada de pólizas activas del mes).'),
  bullet('Acceso directo al listado de "Vence pronto" para actuar rápidamente.'),
  pageBreak(),
];

// ─── SECCIÓN 8: MÓDULOS BASE ──────────────────────────────────────────────────
const section8 = [
  h1('8. Módulos Base del Sistema'),
  body('Además de los módulos enriquecidos incluidos en el alcance, el sistema posee una base de funcionalidades core que operan de forma transversal:'),

  h2('8.1 Dashboard Principal'),
  bullet('Tarjetas de KPIs: pólizas activas, vencidas, próximas a vencer, comisiones del mes.'),
  bullet('Gráfico de barras: evolución de comisiones por mes.'),
  bullet('Lista de las próximas 5 pólizas a vencer.'),
  bullet('Calendario de vencimientos y cobros (integración con ArgentinaHolidays para feriados).'),

  h2('8.2 Gestión de Clientes (CRM)'),
  bullet('Ficha de cliente: nombre, DNI/CUIT, teléfono, email, dirección completa.'),
  bullet('Historial de pólizas asociadas a cada cliente.'),
  bullet('Búsqueda instantánea y filtros.'),
  bullet('Integración con formulario de pólizas: al tipear el nombre, autocompleta los datos del cliente.'),

  h2('8.3 Gestión de Pólizas'),
  bullet('Formulario de alta con validación por Zod (esquema estricto): datos del cliente, aseguradora, rubro, número de póliza, fechas, prima, suma asegurada, moneda, medio de pago, vigencia y porcentaje de comisión.'),
  bullet('El porcentaje de comisión se pre-rellena automáticamente según la configuración guardada para la combinación aseguradora + rubro.'),
  bullet('La fecha de vencimiento se calcula automáticamente a partir de la fecha de inicio y la vigencia, pero puede editarse manualmente.'),
  bullet('Soporte para campos específicos de Vida y Retiro: edad del asegurado, si fuma, edad de retiro, fondo acumulado.'),

  h2('8.4 Módulo de Comisiones'),
  bullet('Tabla de comisiones ganadas con filtros por período, aseguradora y rubro.'),
  bullet('Cálculo automático: prima × porcentaje de comisión = comisión calculada.'),
  bullet('Exportación a Excel.'),

  h2('8.5 Notas Rápidas'),
  bullet('Bloc de notas integrado al sistema para apuntes sin formato.'),
  bullet('Las notas se guardan por usuario y persisten entre sesiones.'),

  h2('8.6 Herramientas (ToolsPage)'),
  bullet('Calculadora de comisiones por rubro.'),
  bullet('Conversor de fechas (días desde inicio a fecha de vencimiento).'),
  bullet('Otras utilidades de uso frecuente para el PAS.'),

  h2('8.7 Perfil y Configuración'),
  bullet('Datos del productor: nombre, matrícula SSN, email, teléfono.'),
  bullet('Gestión de suscripción y plan activo.'),
  bullet('Código de referidos con contador de referidos del mes y totales.'),

  h2('8.8 Programa de Referidos'),
  bullet('Cada usuario tiene un código de referido único.'),
  bullet('Al new usuario registrarse con ese código, el referente acumula referidos.'),
  bullet('El panel muestra referidos del mes y referidos totales.'),
  pageBreak(),
];

// ─── SECCIÓN 9: PROPUESTA POR ETAPAS ────────────────────────────────────────
const section9 = [
  h1('9. Propuesta de Implementación por Etapas'),
  body('Los módulos detallados en este documento se implementarán en dos etapas consecutivas, permitiendo al cliente comenzar a operar las funcionalidades de mayor impacto inmediato antes de incorporar los módulos de gestión financiera y administrativa.'),
  ...spacer(1),

  // ── ETAPA 1 ──
  new Paragraph({
    spacing: { before: 320, after: 80 },
    shading: { type: ShadingType.CLEAR, fill: C_DARKBG },
    children: [
      new TextRun({ text: '  ETAPA 1 — Operaciones y Captación de Clientes', font, size: 26, bold: true, color: C_WHITE }),
    ],
  }),
  new Paragraph({
    spacing: { before: 0, after: 160 },
    shading: { type: ShadingType.CLEAR, fill: C_DARKBG },
    children: [
      new TextRun({ text: '  $210.000', font, size: 36, bold: true, color: C_WARNING }),
    ],
  }),
  body('Incluye los módulos que impactan directamente en la operación diaria del productor y en la captación de nuevos asegurados:'),
  bullet('Módulo de Siniestros — gestión completa de reclamos con estados, prioridad automática, historial de notas y exportación.'),
  bullet('Módulo de Cotizaciones + Página Pública — cotizador con link/QR compartible sin login para Auto, Moto, Hogar y otros.'),
  bullet('Login con Google + Multi-moneda (ARS/USD/EUR/BRL) + soporte de Caución como ramo financiero.'),
  ...spacer(1),

  // ── ETAPA 2 ──
  new Paragraph({
    spacing: { before: 320, after: 80 },
    shading: { type: ShadingType.CLEAR, fill: C_PRIMARY },
    children: [
      new TextRun({ text: '  ETAPA 2 — Administración Financiera y Automatización', font, size: 26, bold: true, color: C_WHITE }),
    ],
  }),
  new Paragraph({
    spacing: { before: 0, after: 160 },
    shading: { type: ShadingType.CLEAR, fill: C_PRIMARY },
    children: [
      new TextRun({ text: '  $230.000', font, size: 36, bold: true, color: C_WARNING }),
    ],
  }),
  body('Incluye los módulos orientados al control financiero, los vínculos con aseguradoras y la automatización del ciclo de vida de las pólizas:'),
  bullet('Directorio de Aseguradoras y Brokers — datos fiscales, credenciales de portales y vinculación con brokers/organizaciones.'),
  bullet('Facturación de Comisiones — facturas por aseguradora, estados de cobro, pagos parciales y detección de diferencias.'),
  bullet('Gestión de Cuotas y Renovación Automática — generación de cuotas en lote y renovación automática al registrar el último pago.'),
  ...spacer(2),

  makeTable(
    ['', 'Etapa 1', 'Etapa 2', 'TOTAL'],
    [
      ['Precio', '$210.000', '$230.000', '$440.000'],
    ]
  ),
  pageBreak(),
];

// ─── SECCIÓN 10: NOTA FINAL ───────────────────────────────────────────────────
const section10 = [
  h1('10. Nota Final'),
  body('Este documento fue preparado luego de analizar el PRD v1.1 (Marzo 2026) y el prototipo del cliente (pas_nuevo). El objetivo es garantizar que el cliente tenga expectativas claras y documentadas sobre qué recibirá con el presupuesto del Sistema Pro ($200.000 + hosting + dominio).', { bold: false }),
  ...spacer(1),
  body('Cualquier funcionalidad no listada en este documento puede ser incorporada al proyecto en una fase posterior, previa aprobación de un presupuesto específico para cada módulo.', { italic: true }),
  ...spacer(2),
  makeTable(
    ['Equipo', 'Rol', 'Fecha'],
    [
      ['ZIGO DEV', 'Equipo de Desarrollo', 'Abril 2026'],
      ['PAS ALERT', 'Product Owner / Cliente', 'Abril 2026'],
    ]
  ),
  ...spacer(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'PAS Alert — Insurance Tech — Abril 2026', font, size: 18, color: C_GRAY, italic: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'Este documento es confidencial y está dirigido exclusivamente al cliente.', font, size: 16, color: C_GRAY, italic: true }),
    ],
  }),
];

// ─── ARMAR DOCUMENTO ──────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'ZIGO DEV',
  title: 'PAS Alert — Documento de Alcance Sistema Pro',
  description: 'Módulos incluidos con detalle funcional — Abril 2026',
  styles: {
    default: {
      document: {
        run: { font, size: 20 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
      },
      children: [
        ...coverPage,
        ...indexPage,
        ...section1,
        ...section2,
        ...section3,
        ...section4,
        ...section5,
        ...section6,
        ...section7,
        ...section8,
        ...section9,
        ...section10,
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync('PAS_Alert_Alcance_v2.docx', buffer);
console.log('✅ Documento generado: PAS_Alert_Alcance_v2.docx');
