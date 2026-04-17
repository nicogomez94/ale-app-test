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
  BorderStyle,
  AlignmentType,
  ShadingType,
  CheckBox,
  SymbolRun,
} from "docx";
import { writeFileSync } from "fs";

const BRAND_BLUE = "1E3A5F";
const LIGHT_BLUE = "E8F0FA";
const GREEN = "1A7C3E";
const LIGHT_GREEN = "E6F4EC";
const RED = "B91C1C";
const LIGHT_RED = "FEE2E2";
const GRAY = "6B7280";
const LIGHT_GRAY = "F3F4F6";
const BORDER_GRAY = "D1D5DB";

function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: BRAND_BLUE,
      }),
    ],
  });
}

function subHeading(text, color = BRAND_BLUE) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color,
      }),
    ],
  });
}

function bodyText(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 22,
        ...options,
      }),
    ],
  });
}

function bulletItem(text, color = "000000", bold = false) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text,
        size: 22,
        color,
        bold,
      }),
    ],
  });
}

function subBulletItem(text, color = "000000") {
  return new Paragraph({
    bullet: { level: 1 },
    spacing: { before: 30, after: 30 },
    children: [
      new TextRun({
        text,
        size: 20,
        color,
      }),
    ],
  });
}

function divider() {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER_GRAY },
    },
    spacing: { before: 200, after: 200 },
    children: [],
  });
}

function greenCheck(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: "✔ ", color: GREEN, bold: true, size: 22 }),
      new TextRun({ text, size: 22 }),
    ],
  });
}

function redX(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: "✘ ", color: RED, bold: true, size: 22 }),
      new TextRun({ text, size: 22 }),
    ],
  });
}

function orangeWarning(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: "⚑ ", color: "D97706", bold: true, size: 22 }),
      new TextRun({ text, size: 22 }),
    ],
  });
}

function makeTable(headers, rows, headerBg = BRAND_BLUE) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (h) =>
            new TableCell({
              shading: { fill: headerBg, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" }),
                  ],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (row, ri) =>
          new TableRow({
            children: row.map(
              (cell, ci) =>
                new TableCell({
                  shading: {
                    fill: ri % 2 === 0 ? "FFFFFF" : LIGHT_GRAY,
                    type: ShadingType.CLEAR,
                  },
                  margins: { top: 60, bottom: 60, left: 120, right: 120 },
                  children: [
                    new Paragraph({
                      alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: cell,
                          size: 20,
                          color:
                            cell === "✔ Incluido"
                              ? GREEN
                              : cell === "✘ No incluido"
                              ? RED
                              : cell === "⚑ Cotización adicional"
                              ? "D97706"
                              : "000000",
                          bold: cell.startsWith("✔") || cell.startsWith("✘") || cell.startsWith("⚑"),
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

const doc = new Document({
  creator: "ZIGO DEV",
  title: "PAS Alert – Alcance del Proyecto",
  description: "Documento de alcance: qué está incluido en el presupuesto y qué no",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
        },
      },
      children: [
        // ─── TITLE ───────────────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 80 },
          children: [
            new TextRun({
              text: "PAS ALERT — Insurance Tech",
              bold: true,
              size: 40,
              color: BRAND_BLUE,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [
            new TextRun({
              text: "DOCUMENTO DE ALCANCE DEL PROYECTO",
              bold: true,
              size: 28,
              color: GRAY,
              allCaps: true,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
          children: [
            new TextRun({
              text: "¿Qué está incluido en el presupuesto y qué requiere cotización adicional?",
              size: 22,
              italics: true,
              color: GRAY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: "Preparado por: ", size: 20, color: GRAY }),
            new TextRun({ text: "ZIGO DEV", size: 20, bold: true, color: BRAND_BLUE }),
            new TextRun({ text: "   |   Cliente: ", size: 20, color: GRAY }),
            new TextRun({ text: "Productor Asesor de Seguros (PAS)", size: 20, bold: true }),
            new TextRun({ text: "   |   Fecha: ", size: 20, color: GRAY }),
            new TextRun({ text: "Abril 2026", size: 20 }),
          ],
        }),

        divider(),

        // ─── INTRO ───────────────────────────────────────────────────────
        sectionHeading("1. Introducción"),
        bodyText(
          "Este documento tiene como objetivo dejar en claro, de forma precisa y sin ambigüedades, qué funcionalidades de la plataforma PAS Alert están contempladas dentro del presupuesto acordado (Sistema Pro — $200.000, PRD v1.1, Marzo 2026) y cuáles requieren una cotización adicional."
        ),
        bodyText(
          "La referencia técnica utilizada para este análisis es el prototipo generado por el cliente (desarrollado con Google AI Studio), el cual contiene pantallas y módulos que van más allá de lo acordado en el PRD. El objetivo de este documento es proteger tanto al cliente como al equipo de desarrollo, evitando malentendidos sobre el alcance del trabajo."
        ),

        divider(),

        // ─── PRESUPUESTO ACORDADO ────────────────────────────────────────
        sectionHeading("2. Presupuesto Acordado"),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [] }),

        makeTable(
          ["Versión", "Precio de Desarrollo", "Descripción"],
          [
            ["Sistema Pro", "$200.000 + hosting + dominio", "Plataforma completa: gestión de pólizas, dashboard con estadísticas, comisiones, exportación a Excel y recordatorios automáticos"],
          ]
        ),

        new Paragraph({ spacing: { before: 160, after: 160 }, children: [] }),
        bodyText(
          "Nota: Los precios de hosting y dominio son adicionales al precio de desarrollo y se presupuestan por separado.",
          { italics: true, color: GRAY }
        ),

        divider(),

        // ─── INCLUIDO EN PRO ─────────────────────────────────────────────
        sectionHeading("3. ✔ Incluido en el Presupuesto — Sistema Pro ($200.000)"),

        subHeading("3.1 Landing Page Profesional"),
        greenCheck("Landing page con secciones, diseño optimizado y hero section"),
        greenCheck("Presentación del producto: descripción, planes de suscripción, CTA"),
        greenCheck("Formulario de contacto o botón de registro visible"),
        greenCheck("Diseño responsive (mobile, tablet, desktop)"),

        subHeading("3.2 Autenticación de Usuarios"),
        greenCheck("Pantalla de Login con email y contraseña"),
        greenCheck("Opción para mostrar/ocultar contraseña"),
        greenCheck("Link '¿Olvidaste tu contraseña?'"),
        greenCheck("Registro de nuevos usuarios (nombre, email, contraseña)"),
        greenCheck("Período de prueba gratuita de 10 días (todas las funciones activas)"),
        greenCheck("Panel privado: cada productor ve SOLO sus propios datos"),

        subHeading("3.3 Panel Principal y Navegación"),
        greenCheck("Barra lateral izquierda con menú de navegación a todas las secciones"),
        greenCheck("Barra superior con reloj en tiempo real"),
        greenCheck("Notificación (badge) con número de pólizas por vencer"),
        greenCheck("Avatar del usuario con opción de cerrar sesión"),
        greenCheck("Modo oscuro / modo claro activable"),
        greenCheck("Diseño responsive: funciona en computadora, tablet y celular"),

        subHeading("3.4 Dashboard con Estadísticas (Panel de Control)"),
        greenCheck("Tarjetas de resumen: Pólizas Activas, Vencen en 7 días, Pólizas Vencidas, Clientes Totales"),
        greenCheck("Tablas de pólizas: individuales, empresas, Vida y Retiro"),
        greenCheck("Estado por fila: Activa / Vence pronto / Vencida con indicador visual"),
        greenCheck("Acciones rápidas desde las tablas: WhatsApp con mensaje pre-armado, Email, Editar póliza"),
        greenCheck("Filtro rápido para ver solo las pólizas que vencen pronto"),
        greenCheck("Notificaciones en pantalla: 'La póliza #XXXX de Juan Pérez vence en 3 días'"),

        subHeading("3.5 Gestión de Pólizas (Alta, Edición, Eliminación)"),
        greenCheck("Formulario de nueva póliza con validación automática de todos los campos"),
        greenCheck("Datos del cliente: nombre completo, DNI, teléfono"),
        greenCheck("Datos de la póliza: aseguradora (con autocompletado), rubro, número, fechas inicio/vencimiento"),
        greenCheck("Aseguradoras disponibles: Sancor, Federación Patronal, La Segunda, Mercantil Andina, Zurich y más"),
        greenCheck("Rubros disponibles: Automóvil, Moto, Celular/Electrónica, Hogar, Vida, Retiro, ART, Integral de Comercio, TRO, Consorcio, Flotas y personalizados"),
        greenCheck("Medio de pago de la póliza: Transferencia, Tarjeta de crédito, Tarjeta de débito"),
        greenCheck("Prima (monto en pesos) configurable"),
        greenCheck("% de comisión editable por compañía y rubro (ej: Sancor-Auto 15%, Sancor-Moto 10%)"),
        greenCheck("Cálculo automático de comisión en tiempo real (Prima × % comisión)"),
        greenCheck("Validación en rojo con mensaje explicativo si algún campo es inválido"),
        greenCheck("Organización de pólizas por rubros"),
        greenCheck("Visualización de pólizas vigentes y vencidas"),
        greenCheck("Edición y eliminación de pólizas"),

        subHeading("3.6 Alertas de Vencimiento"),
        greenCheck("Alertas visuales en tiempo real cuando una póliza está por vencer"),
        greenCheck("Botón WhatsApp: abre WhatsApp Web/móvil con mensaje pre-armado dirigido al cliente"),
        greenCheck("Botón Email: abre cliente de correo con mensaje pre-armado dirigido al cliente"),

        subHeading("3.7 Gestión de Clientes (Personas Físicas)"),
        greenCheck("Alta, edición y eliminación de clientes individuales"),
        greenCheck("Datos: nombre completo, DNI, teléfono, email, dirección, código postal"),
        greenCheck("Búsqueda por nombre o DNI en tiempo real"),
        greenCheck("Contacto directo por WhatsApp o Email con un clic"),
        greenCheck("Exportación de toda la lista a Excel (.xlsx)"),

        subHeading("3.8 Gestión de Empresas"),
        greenCheck("Alta, edición y eliminación de clientes corporativos"),
        greenCheck("Tipos en pestañas: ART, Flotas, TRO, Consorcio, Integral de Comercio"),
        greenCheck("Datos: razón social, CUIT, rubro/actividad, cantidad empleados/vehículos, aseguradora, email, teléfono, CP"),
        greenCheck("Búsqueda por razón social o CUIT"),
        greenCheck("Contacto por WhatsApp o Email con un clic"),
        greenCheck("Exportación por tipo de empresa a Excel"),

        subHeading("3.9 Vida y Finanzas"),
        greenCheck("Sección dedicada a seguros de largo plazo"),
        greenCheck("Pestaña Vida: nombre, CUIT, aseguradora, suma asegurada, prima mensual"),
        greenCheck("Pestaña Retiro: nombre, CUIT, aseguradora, aporte mensual, fondo acumulado"),
        greenCheck("Alta, edición y eliminación de pólizas de vida/retiro"),
        greenCheck("Contacto por WhatsApp o Email con un clic"),
        greenCheck("Exportación a Excel por tipo"),

        subHeading("3.10 Análisis de Comisiones"),
        greenCheck("Porcentajes de comisión configurables por compañía y rubro"),
        greenCheck("Recalculo automático al ajustar % en cada póliza"),
        greenCheck("Cierre mensual de comisiones: congela datos del período para historial ordenado"),
        greenCheck("Historial de cierres anteriores consultable en cualquier momento"),
        greenCheck("Comparación de evolución mes a mes"),
        greenCheck("Tarjetas: comisión proyectada del mes, progreso hacia objetivo mensual, comisión promedio por póliza"),
        greenCheck("Gráfico de barras: evolución mensual de comisiones"),
        greenCheck("Gráfico de torta: distribución por rubro (Auto, Moto, Hogar, Vida, Otros)"),
        greenCheck("Tabla mes a mes: prima total, comisión bruta, % crecimiento vs. mes anterior"),
        greenCheck("Exportación de todos los datos de comisiones a Excel"),

        subHeading("3.11 Filtros Avanzados"),
        greenCheck("Filtros por rubros, estado de póliza y vencimiento"),
        greenCheck("Búsqueda en tiempo real en todas las secciones"),

        subHeading("3.12 Exportación a Excel"),
        greenCheck("Exportación de pólizas, clientes, empresas, comisiones y vida/finanzas a Excel (.xlsx)"),

        subHeading("3.13 Recordatorios Automáticos por Email"),
        greenCheck("Envío automático de email de recordatorio de vencimiento de pólizas"),
        greenCheck("Plantilla de email pre-armada con datos de la póliza y del cliente"),
        orangeWarning(
          "Aclaración: requiere configuración de un servicio externo de email (ej. SendGrid). El costo del servicio de email es adicional al desarrollo."
        ),

        subHeading("3.14 Reportes y Métricas"),
        greenCheck("Reportes de rendimiento de la cartera"),
        greenCheck("Métricas del sistema disponibles en el panel administrador"),

        subHeading("3.15 Sistema de Membresía Paga"),
        greenCheck("Planes disponibles: Gratis (10 días), Emprendedor ($4.999/mes), Profesional ($12.999/mes), Agencia ($29.999/mes)"),
        greenCheck("Límites por plan: pólizas, clientes y empresas según plan"),
        greenCheck("Integración completa con MercadoPago: transferencia bancaria, tarjeta de crédito y débito"),
        greenCheck("Cobro automático mensual con tarjeta de crédito hasta solicitar la baja"),
        greenCheck("Recordatorios de vencimiento dentro de la plataforma a partir de los 5 días previos"),
        greenCheck("Notificación diaria si no renueva ('Te quedan 4 días', 'Te quedan 3 días', etc.)"),
        greenCheck("Bloqueo de acceso al vencer hasta completar el pago"),
        greenCheck("Historial de pagos realizados"),

        subHeading("3.16 Programa de Referidos"),
        greenCheck("Código de referido único y personalizado por usuario"),
        greenCheck("Compartir código por WhatsApp o Email con un clic"),
        greenCheck("Beneficios: 1 ref → 10% desc | 5 ref → 50% desc | 10 ref → mes 100% bonificado"),
        greenCheck("Panel: contador mensual, barra de progreso, total histórico"),
        greenCheck("Reset automático el día 1 de cada mes"),

        subHeading("3.17 Perfil del Usuario"),
        greenCheck("Edición de: foto de perfil, nombre, email, teléfono, dirección de oficina"),
        greenCheck("Información fija: número de matrícula PAS, último inicio de sesión"),
        greenCheck("Opción de cambio de contraseña"),
        greenCheck("Confirmación visual al guardar cambios"),

        subHeading("3.18 Panel Administrador"),
        greenCheck("Panel para gestionar todos los productores registrados"),
        greenCheck("Ver, activar/desactivar cuentas de productores"),
        greenCheck("Monitoreo de suscripciones activas"),

        divider(),

        // ─── FUERA DE ALCANCE (PRD) ──────────────────────────────────────
        sectionHeading("4. ✘ Fuera del Alcance — Explícitamente Excluido en el PRD"),
        bodyText(
          "Las siguientes funcionalidades están textualmente mencionadas como FUERA DEL ALCANCE en la Sección 5 del PRD. No están incluidas en el presupuesto del Sistema Pro y requieren una cotización separada."
        ),

        redX("Aplicación móvil nativa (iOS / Android)"),
        redX("Bot automatizado de WhatsApp o Email (los botones del sistema abren el cliente del usuario en forma manual; no es envío automatizado masivo)"),
        redX("Integración con sistemas o APIs de aseguradoras externas"),
        redX("Módulo contable o de facturación fiscal"),
        redX("Exportación de reportes en PDF (solo Excel está incluido)"),
        redX("Multi-idioma (la plataforma es exclusivamente en español)"),

        divider(),

        // ─── EXTRAS EN PROTOTIPO ─────────────────────────────────────────
        sectionHeading("5. ⚑ Funcionalidades del Prototipo que Requieren Cotización Adicional"),

        bodyText(
          "El prototipo entregado por el cliente (desarrollado con Google AI Studio) incluye módulos que NO forman parte del PRD acordado. Estas pantallas están en el prototipo como referencia visual/conceptual, pero NO están incluidas en el presupuesto del Sistema Pro ($200.000)."
        ),
        bodyText(
          "Si el cliente desea incorporar alguna de estas funcionalidades al sistema final, se deberá acordar y cotizar por separado antes de comenzar el desarrollo.",
          { bold: true }
        ),

        new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

        makeTable(
          ["Módulo / Funcionalidad", "Descripción", "Estado"],
          [
            [
              "Módulo de Siniestros",
              "Gestión completa de reclamos: lifecycle de estados (Denunciado → Pagado), prioridades automáticas, documentos adjuntos, notas con timestamps, montos reclamados/aprobados/pagados",
              "⚑ Cotización adicional",
            ],
            [
              "Módulo de Cotizaciones",
              "Gestión de cotizaciones de seguros (Auto, Moto, Hogar, Otros) + página pública compartible por link para que clientes pidan cotizaciones sin login",
              "⚑ Cotización adicional",
            ],
            [
              "Directorio de Aseguradoras",
              "Gestión de compañías aseguradoras: datos fiscales (CUIT, IVA), credenciales de acceso al portal, gestión de brokers con código de colores, vinculación de facturas por aseguradora",
              "⚑ Cotización adicional",
            ],
            [
              "Facturación de Comisiones",
              "Módulo detallado de facturas de comisiones por aseguradora: estados (Pendiente, Facturada, Cobrada, Parcial, Vencida), múltiples pagos por factura, upload de documentos, cálculo de diferencias, informe de antigüedad",
              "⚑ Cotización adicional",
            ],
            [
              "Calendario de Negocio",
              "Calendario mensual con feriados argentinos integrados, notas por día con colores, marcar notas como leídas/no leídas",
              "⚑ Cotización adicional",
            ],
            [
              "Notas Rápidas",
              "Sistema de captura rápida de ideas y recordatorios: notas con fecha, paleta de colores y búsqueda",
              "⚑ Cotización adicional",
            ],
            [
              "Módulo de Sugerencias",
              "Formulario de feedback del usuario con categorías (diseño, bugs, funcionalidades, etc.) y calificación por estrellas",
              "⚑ Cotización adicional",
            ],
            [
              "Herramientas (ToolsPage)",
              "Calculadora numérica con soporte de teclado, biblioteca de scripts de comunicación, lanzador de chat",
              "⚑ Cotización adicional",
            ],
            [
              "Gestión de cuotas y renovación automática de pólizas",
              "Al marcar una póliza como 'Pagada' e ingresar la fecha de pago, el sistema genera automáticamente la póliza del período siguiente con fechas calculadas según la vigencia (mensual, trimestral, semestral, anual). Incluye pólizas encadenadas por groupId, contador de cuotas (1/1, 2/4, etc.), actualización en cascada de fechas, y manejo de casos borde (edición, eliminación de cuotas intermedias, cambio de medio de pago). El PRD solo contempla carga y edición manual de pólizas.",
              "⚑ Cotización adicional",
            ],
            [
              "Login con Google (OAuth)",
              "Autenticación mediante cuenta de Google. El PRD solo incluye login por email y contraseña.",
              "⚑ Cotización adicional",
            ],
            [
              "Soporte multi-moneda",
              "Pólizas en USD, EUR y BRL además de ARS",
              "⚑ Cotización adicional",
            ],
            [
              "Tipo de empresa 'Caución'",
              "Empresa tipo Caución (pólizas de garantía) no estaba listada en el PRD",
              "⚑ Cotización adicional",
            ],
          ]
        ),

        new Paragraph({ spacing: { before: 240, after: 80 }, children: [] }),

        divider(),

        // ─── RESUMEN EJECUTIVO ───────────────────────────────────────────
        sectionHeading("6. Resumen Ejecutivo"),

        new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

        makeTable(
          ["Módulo / Funcionalidad", "Descripción resumida", "Sistema Pro ($200.000)"],
          [
            ["Landing Page profesional", "Secciones, CTA, diseño responsive", "✔ Incluido"],
            ["Login / Registro / Prueba 10 días", "Email+clave, panel privado por PAS", "✔ Incluido"],
            ["Panel principal y navegación", "Menú, modo oscuro, responsive", "✔ Incluido"],
            ["Dashboard con estadísticas", "Tarjetas, tablas, filtros rápidos, alertas", "✔ Incluido"],
            ["Gestión de pólizas", "Alta, edición, eliminación, validación, rubros", "✔ Incluido"],
            ["Prima, % comisión y cálculo automático", "Por compañía y rubro, editable", "✔ Incluido"],
            ["Alertas de vencimiento", "Visual + WhatsApp/Email manual con mensaje pre-armado", "✔ Incluido"],
            ["Gestión de clientes individuales", "CRUD completo + exportación Excel", "✔ Incluido"],
            ["Gestión de empresas", "ART, Flotas, TRO, Consorcio, Integral + Excel", "✔ Incluido"],
            ["Vida y Finanzas", "Vida + Retiro con aporte mensual y fondo acumulado", "✔ Incluido"],
            ["Análisis de comisiones + cierres mensuales", "%, gráficos, historial, comparación", "✔ Incluido"],
            ["Filtros avanzados", "Por rubro, estado y vencimiento", "✔ Incluido"],
            ["Exportación a Excel", "Pólizas, clientes, empresas, comisiones, vida", "✔ Incluido"],
            ["Recordatorios automáticos por email", "Envío automático + plantilla pre-armada", "✔ Incluido"],
            ["Reportes y métricas", "Rendimiento de cartera, métricas de admin", "✔ Incluido"],
            ["Sistema de membresía + MercadoPago", "4 planes, cobro automático, bloqueo al vencer", "✔ Incluido"],
            ["Programa de referidos", "Código único, descuentos escalonados", "✔ Incluido"],
            ["Perfil del usuario", "Foto, datos, matrícula, cambio de clave", "✔ Incluido"],
            ["Panel administrador", "Gestión de todos los productores", "✔ Incluido"],
            ["Módulo de Siniestros", "Gestión de reclamos/claims completa", "✘ No incluido"],
            ["Módulo de Cotizaciones + página pública", "Cotizador compartible sin login", "✘ No incluido"],
            ["Directorio de Aseguradoras + Brokers", "Datos fiscales, credenciales, brokers", "✘ No incluido"],
            ["Facturación de Comisiones detallada", "Facturas por aseguradora, estados, docs", "✘ No incluido"],
            ["Calendario de negocio", "Feriados AR, notas por día coloreadas", "✘ No incluido"],
            ["Notas rápidas", "Captura rápida de ideas y recordatorios", "✘ No incluido"],
            ["Herramientas (calculadora, scripts, chat)", "Herramientas auxiliares del productor", "✘ No incluido"],
            ["Login con Google / multi-moneda / Caución", "Extras del prototipo fuera del PRD", "✘ No incluido"],
            ["Gestión de cuotas y renovación automática", "Póliza siguiente auto-generada al marcar como pagada + fecha", "✘ No incluido"],
            ["App móvil nativa iOS/Android", "Aplicación nativa (fuera del alcance del PRD)", "✘ No incluido"],
            ["Bot automatizado WhatsApp/Email masivo", "Envío sin intervención manual", "✘ No incluido"],
          ]
        ),

        new Paragraph({ spacing: { before: 240, after: 80 }, children: [] }),

        divider(),

        // ─── NOTA FINAL ─────────────────────────────────────────────────
        sectionHeading("7. Nota Final"),
        bodyText(
          "Este documento fue preparado luego de analizar el PRD v1.1 (Marzo 2026) y el prototipo del cliente (pas_nuevo). El objetivo es evitar scope creep (expansión no acordada del alcance) y garantizar que el cliente tenga expectativas claras sobre qué recibirá con el presupuesto del Sistema Pro ($200.000 + hosting + dominio)."
        ),
        bodyText(
          "Cualquier funcionalidad marcada como '⚑ Cotización adicional' o '✘ No incluido' puede ser incorporada al proyecto en una fase posterior, previa aprobación de un presupuesto específico para cada módulo.",
        ),
        new Paragraph({ spacing: { before: 120, after: 40 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 60 },
          children: [
            new TextRun({ text: "ZIGO DEV — Equipo de Desarrollo", bold: true, size: 20, color: BRAND_BLUE }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 60 },
          children: [
            new TextRun({ text: "PAS Alert — Insurance Tech — Abril 2026", size: 20, color: GRAY, italics: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({
              text: "Este documento es confidencial y está dirigido exclusivamente al cliente.",
              size: 18,
              color: GRAY,
              italics: true,
            }),
          ],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("PAS_Alert_Alcance_Presupuesto.docx", buffer);
console.log("✔ Documento generado: PAS_Alert_Alcance_Presupuesto.docx");
