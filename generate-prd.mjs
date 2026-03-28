import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, PageBreak, VerticalAlign,
} from 'docx';
import { writeFileSync } from 'fs';

// ─── Color palette ───────────────────────────────────────────────────────────
const NAVY   = '1a237e';
const GREEN  = '00c853';
const GRAY   = 'f5f5f5';
const WHITE  = 'FFFFFF';
const DARK   = '212121';
const MEDIUM = '757575';

// ─── Text helpers ─────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 36, color: NAVY })],
  spacing: { before: 400, after: 200 },
  border: {
    bottom: { style: BorderStyle.THICK, size: 8, color: NAVY },
    left: { style: BorderStyle.THICK, size: 16, color: GREEN }
  },
  indent: { left: 200, right: 200 }
});

const h2 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 28, color: NAVY })],
  spacing: { before: 360, after: 160 },
  border: { bottom: { style: BorderStyle.THICK, size: 4, color: NAVY } }
});

const h3 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 24, color: '303f9f' })],
  spacing: { before: 240, after: 120 },
});

const body = (text, options = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, color: DARK, ...options })],
  spacing: { before: 80, after: 80 },
});

const bullet = (text, level = 0) => new Paragraph({
  children: [new TextRun({ text, size: 22, color: DARK })],
  bullet: { level },
  spacing: { before: 60, after: 60 },
  indent: { left: 360 + level * 360 },
});

const italic = (text) => new Paragraph({
  children: [new TextRun({ text, italics: true, size: 20, color: MEDIUM })],
  spacing: { before: 60, after: 60 },
});

const spacer = (lines = 1) => new Paragraph({ text: '', spacing: { before: 100 * lines, after: 100 * lines } });

// ─── Table helpers ────────────────────────────────────────────────────────────
const headerCell = (text, widthPct) => new TableCell({
  width: { size: widthPct, type: WidthType.PERCENTAGE },
  shading: { type: ShadingType.SOLID, fill: 'EEEEEE' },
  verticalAlign: VerticalAlign.CENTER,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 2, color: NAVY },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: NAVY },
    left: { style: BorderStyle.SINGLE, size: 2, color: NAVY },
    right: { style: BorderStyle.SINGLE, size: 2, color: NAVY },
  },
  children: [new Paragraph({
    children: [new TextRun({ text, bold: true, color: NAVY, size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 }
  })]
});

const dataCell = (text, shade = false, bold = false) => new TableCell({
  shading: { type: ShadingType.SOLID, fill: shade ? GRAY : WHITE },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    children: [new TextRun({ text, size: 20, bold, color: DARK })],
    spacing: { before: 80, after: 80 },
    indent: { left: 120 }
  })]
});

const checkCell = (val, shade = false) => new TableCell({
  shading: { type: ShadingType.SOLID, fill: shade ? GRAY : WHITE },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    children: [new TextRun({ text: val ? '✓' : '—', size: 22, bold: val, color: val ? '00c853' : MEDIUM })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 }
  })]
});

// ─── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: DARK },
        paragraph: { spacing: { line: 276 } }
      }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }
      }
    },
    children: [

      // ══════════════════════════════════════════════════════════
      // PORTADA
      // ══════════════════════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: 'PAS ALERT', bold: true, size: 72, color: NAVY })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Insurance Tech', size: 32, color: MEDIUM, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 }
      }),
      new Paragraph({
        children: [new TextRun({ text: '─────────────────────────────────', color: NAVY, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'DOCUMENTO DE REQUERIMIENTOS DE PRODUCTO', bold: true, size: 36, color: DARK })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 300 }
      }),
      new Paragraph({
        children: [new TextRun({ text: '(PRD — Product Requirements Document)', size: 24, color: MEDIUM, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Versión 1.1  |  Marzo 2026', size: 22, color: MEDIUM })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Preparado por: Equipo de Desarrollo', size: 22, color: MEDIUM })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Cliente: Productor de Seguros (PAS)', size: 22, color: MEDIUM })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 1200 }
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════
      // 1. RESUMEN EJECUTIVO
      // ══════════════════════════════════════════════════════════
      h1('  1.  RESUMEN EJECUTIVO'),
      spacer(),
      body('PAS Alert es una plataforma web diseñada exclusivamente para Productores Asesores de Seguros (PAS) de Argentina. Su objetivo es digitalizar y automatizar la gestión de la cartera de pólizas, reemplazando planillas de Excel o anotaciones manuales por un sistema profesional, seguro y accesible desde cualquier dispositivo.'),
      spacer(),
      body('La plataforma permite que cada productor tenga su propio panel privado donde puede cargar, organizar y hacer seguimiento de todas sus pólizas: vencimientos, comisiones, clientes y empresas, todo en un solo lugar.'),
      spacer(),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            headerCell('Dato', 35),
            headerCell('Detalle', 65),
          ]}),
          new TableRow({ children: [ dataCell('Nombre del producto', false, true), dataCell('PAS Alert – Insurance Tech') ]}),
          new TableRow({ children: [ dataCell('Tipo de sistema', true, true), dataCell('Aplicación web, accesible desde cualquier navegador sin instalar nada', true) ]}),
          new TableRow({ children: [ dataCell('Usuarios objetivo', false, true), dataCell('Productores Asesores de Seguros (PAS) de Argentina') ]}),
          new TableRow({ children: [ dataCell('Período de prueba gratuita', true, true), dataCell('10 días con todas las funciones habilitadas', true) ]}),
          new TableRow({ children: [ dataCell('Pagos en línea', false, true), dataCell('MercadoPago — cupón, débito CBU o tarjeta de crédito/débito') ]}),
          new TableRow({ children: [ dataCell('Exportación de datos', true, true), dataCell('Excel (.xlsx) — disponible en todas las secciones', true) ]}),
          new TableRow({ children: [ dataCell('Idioma', false, true), dataCell('Español') ]}),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════
      // 2. OPCIONES Y PRECIOS ACORDADOS
      // ══════════════════════════════════════════════════════════
      h1('  2.  OPCIONES DE DESARROLLO'),
      spacer(),
      body('Se acordaron dos versiones del sistema, con diferente nivel de funcionalidad y precio.'),
      spacer(2),

      h2('Opción 1 — Sistema Lite'),
      body('Precio de desarrollo: $150.000 + hosting + dominio', { bold: true, size: 24 }),
      spacer(),
      bullet('Landing Page profesional con secciones y diseño optimizado'),
      bullet('Login de usuarios (registro e inicio de sesión seguros)'),
      bullet('Panel privado por productor (cada usuario solo ve sus propios datos)'),
      bullet('Carga de pólizas de seguros'),
      bullet('Organización de pólizas por rubros (Automotor, Hogar, ART, Flotas, etc.)'),
      bullet('Visualización de pólizas vigentes y vencidas'),
      bullet('Alertas cuando una póliza está por vencer o ya venció'),
      bullet('Sistema de membresía paga (distintos planes de suscripción)'),
      bullet('Edición y eliminación de pólizas'),
      bullet('Panel administrador para gestionar todos los productores'),
      spacer(2),

      h2('Opción 2 — Sistema Pro'),
      body('Precio de desarrollo: $200.000 + hosting + dominio', { bold: true, size: 24 }),
      spacer(),
      body('Incluye todo lo de la versión Lite, más:'),
      spacer(),
      bullet('Dashboard con estadísticas de la cartera'),
      bullet('Filtros avanzados por rubros, vencimientos y estado'),
      bullet('Exportación de pólizas a Excel / CSV'),
      bullet('Sistema de recordatorios automáticos por email'),
      bullet('Reportes y métricas del sistema'),
      spacer(2),

      h2('Comparativo rápido'),
      spacer(),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            headerCell('Funcionalidad', 55),
            headerCell('Lite', 22),
            headerCell('Pro', 23),
          ]}),
          new TableRow({ children: [ dataCell('Landing Page profesional'),                      checkCell(true),        checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Login y panel privado por PAS', true),           checkCell(true, true),  checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Carga y gestión de pólizas'),                    checkCell(true),        checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Prima y % de comisión por rubro/compañía', true),checkCell(true, true),  checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Medio de pago en cada póliza'),                  checkCell(true),        checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Organización por rubros', true),                 checkCell(true, true),  checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Alertas de vencimiento'),                        checkCell(true),        checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Contacto por WhatsApp y Email', true),           checkCell(true, true),  checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Sistema de membresía paga'),                     checkCell(true),        checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Panel administrador', true),                     checkCell(true, true),  checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Dashboard con estadísticas'),                    checkCell(false),       checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Filtros avanzados', true),                       checkCell(false, true), checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Exportación a Excel'),                           checkCell(false),       checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Cierres de comisión mensuales', true),           checkCell(false, true), checkCell(true, true) ]}),
          new TableRow({ children: [ dataCell('Recordatorios automáticos por email'),           checkCell(false),       checkCell(true) ]}),
          new TableRow({ children: [ dataCell('Reportes y métricas', true),                     checkCell(false, true), checkCell(true, true) ]}),
          new TableRow({ children: [
            dataCell('Precio de desarrollo', false, true),
            dataCell('$150.000', false, true),
            dataCell('$200.000', false, true),
          ]}),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════
      // 3. FUNCIONALIDADES DETALLADAS
      // ══════════════════════════════════════════════════════════
      h1('  3.  FUNCIONALIDADES DETALLADAS'),
      spacer(),
      body('A continuación se describe cada módulo de la aplicación tal como está construido en el prototipo entregado.'),

      // ─── 3.1 LOGIN ────────────────────────────────────────────
      spacer(),
      h2('3.1  Pantalla de Login'),
      body('Es la puerta de entrada a la plataforma. Diseñada con imagen de marca y formulario de acceso seguro.'),
      spacer(),
      h3('Lo que ve el usuario:'),
      bullet('Lado izquierdo: logo PAS Alert, slogan y descripción de la plataforma.'),
      bullet('Lado derecho: formulario con campo de email, contraseña (con opción de mostrar/ocultar) y botón "Ingresar".'),
      bullet('Link de "¿Olvidaste tu contraseña?" y opción de registro para nuevos usuarios.'),
      spacer(),
      h3('Lo que hace el sistema:'),
      bullet('Verifica las credenciales contra la base de datos.'),
      bullet('Si son correctas, redirige al panel del productor.'),
      bullet('Si son incorrectas, muestra un mensaje de error claro.'),

      // ─── 3.2 LAYOUT / NAVEGACION ─────────────────────────────
      spacer(),
      h2('3.2  Panel Principal y Navegación'),
      body('Una vez dentro, el productor accede a su espacio de trabajo. La interfaz tiene:'),
      spacer(),
      bullet('Barra lateral izquierda (menú) con acceso a todas las secciones.'),
      bullet('Barra superior con: reloj en tiempo real, notificación de pólizas por vencer (badge con número), avatar del usuario y opción de cerrar sesión.'),
      bullet('Modo oscuro / modo claro activable con un botón.'),
      bullet('Diseño responsive: funciona en computadora, tablet y celular.'),
      spacer(),
      h3('Ítems del menú:'),
      bullet('Dashboard', 1),
      bullet('Clientes', 1),
      bullet('Empresas', 1),
      bullet('Vida y Finanzas', 1),
      bullet('Pólizas (agregar nuevas)', 1),
      bullet('Comisiones', 1),
      bullet('Referidos', 1),
      bullet('Suscripción', 1),

      // ─── 3.3 DASHBOARD ────────────────────────────────────────
      spacer(),
      h2('3.3  Dashboard (Panel de Control)'),
      body('Vista general del estado de la cartera del productor. Es la primera pantalla que ve al ingresar.'),
      spacer(),
      h3('Tarjetas de resumen (parte superior):'),
      bullet('Pólizas Activas: total de pólizas en vigencia.'),
      bullet('Vencen en 7 días: cantidad que requieren atención inmediata (con alerta visual).'),
      bullet('Pólizas Vencidas: las que ya expiraron.'),
      bullet('Clientes Totales: tamaño de la cartera activa.'),
      spacer(),
      h3('Tablas de pólizas:'),
      bullet('Tabla de pólizas de clientes individuales.'),
      bullet('Tabla de pólizas de empresas.'),
      bullet('Tabla de pólizas de Vida y Retiro.'),
      bullet('Cada fila muestra: cliente, aseguradora, fecha de vencimiento, días restantes, medio de pago, estado (Activa / Vence pronto / Vencida) y acciones.'),
      spacer(),
      h3('Acciones desde las tablas:'),
      bullet('Botón WhatsApp: abre WhatsApp con un mensaje pre-armado al cliente avisando del vencimiento.'),
      bullet('Botón Email: abre el cliente de correo con un mensaje pre-armado al cliente.'),
      bullet('Botón Editar: accede al formulario de edición de la póliza.'),
      bullet('Botón "Agregar Póliza": acceso rápido al formulario de nueva póliza.'),
      spacer(),
      h3('Alertas del sistema:'),
      bullet('Se muestran notificaciones en pantalla con avisos como "La póliza #XXXX de Juan Pérez vence en 3 días" o "Póliza vencida".'),
      bullet('Filtro rápido para ver solo las pólizas que vencen pronto.'),

      // ─── 3.4 CLIENTES ─────────────────────────────────────────
      spacer(),
      h2('3.4  Gestión de Clientes (Individuales)'),
      body('Sección para administrar la cartera de personas físicas del productor.'),
      spacer(),
      h3('Datos de cada cliente:'),
      bullet('Nombre completo'),
      bullet('DNI'),
      bullet('Teléfono'),
      bullet('Email'),
      bullet('Dirección'),
      bullet('Código Postal (C.P.)'),
      spacer(),
      h3('Funcionalidades:'),
      bullet('Buscar por nombre o DNI en tiempo real.'),
      bullet('Agregar nuevo cliente (individuo) o redirigir a "Nueva Empresa".'),
      bullet('Editar datos de un cliente existente.'),
      bullet('Eliminar cliente (con confirmación para evitar errores).'),
      bullet('Contactar por WhatsApp con un clic.'),
      bullet('Enviar email directamente desde la plataforma con un clic.'),
      bullet('Exportar toda la lista a Excel (.xlsx).'),

      // ─── 3.5 EMPRESAS ─────────────────────────────────────────
      spacer(),
      h2('3.5  Gestión de Empresas'),
      body('Sección para administrar clientes corporativos, organizada en pestañas por tipo de seguro empresarial.'),
      spacer(),
      h3('Tipos de empresa (pestañas):'),
      bullet('ART (Aseguradora de Riesgos del Trabajo)'),
      bullet('Flotas (vehículos de empresa)'),
      bullet('TRO (Todo Riesgo Operativo)'),
      bullet('Consorcio'),
      bullet('Integral de Comercio'),
      spacer(),
      h3('Datos de cada empresa:'),
      bullet('Razón social'),
      bullet('CUIT'),
      bullet('Rubro / actividad'),
      bullet('Cantidad de empleados o vehículos (según tipo)'),
      bullet('Aseguradora'),
      bullet('Email y teléfono'),
      bullet('Código Postal (C.P.)'),
      spacer(),
      h3('Funcionalidades:'),
      bullet('Buscar por razón social o CUIT.'),
      bullet('Agregar, editar y eliminar empresas.'),
      bullet('Contactar por WhatsApp con un clic.'),
      bullet('Enviar email directamente desde la plataforma con un clic.'),
      bullet('Exportar la pestaña activa a Excel (por tipo de empresa).'),

      // ─── 3.6 VIDA Y FINANZAS ──────────────────────────────────
      spacer(),
      h2('3.6  Vida y Finanzas'),
      body('Sección dedicada a seguros de largo plazo, separada en dos categorías con campos específicos.'),
      spacer(),
      h3('Pestaña: Seguros de Vida'),
      bullet('Datos del asegurado: nombre, CUIT, aseguradora.'),
      bullet('Suma asegurada (capital en caso de fallecimiento).'),
      bullet('Prima mensual.'),
      spacer(),
      h3('Pestaña: Seguros de Retiro'),
      bullet('Datos del asegurado: nombre, CUIT, aseguradora.'),
      bullet('Aporte mensual.'),
      bullet('Fondo acumulado (se muestra en verde para destacar el progreso).'),
      spacer(),
      h3('Funcionalidades comunes:'),
      bullet('Buscar por cliente o CUIT.'),
      bullet('Agregar, editar y eliminar pólizas.'),
      bullet('Contactar por WhatsApp o Email con un clic.'),
      bullet('Exportar a Excel por tipo.'),

      // ─── 3.7 POLIZAS ──────────────────────────────────────────
      spacer(),
      h2('3.7  Formulario de Nueva Póliza'),
      body('Formulario para cargar pólizas generales (individuales, hogar, automotor, etc.). Incluye validación automática de todos los campos.'),
      spacer(),
      h3('Sección: Datos del Cliente'),
      bullet('Nombre completo (mínimo 3 caracteres)'),
      bullet('DNI (mínimo 7 dígitos)'),
      bullet('Teléfono (mínimo 8 dígitos)'),
      spacer(),
      h3('Sección: Detalles de la Póliza'),
      bullet('Aseguradora (con autocompletado): Sancor, Federación Patronal, La Segunda, Mercantil Andina, Zurich, etc.'),
      bullet('Rubro (con autocompletado): Automotor, Hogar, Vida, Retiro, ART, Integral de Comercio, TRO, Consorcio.'),
      bullet('Número de póliza'),
      bullet('Fecha de inicio'),
      bullet('Fecha de vencimiento (por defecto: 1 año desde hoy)'),
      bullet('Medio de pago: Cupón, Débito CBU o Débito / Tarjeta de crédito.'),
      spacer(),
      h3('Sección: Comisión'),
      bullet('Prima (monto en pesos que paga el asegurado).'),
      bullet('Porcentaje de comisión: editable manualmente. Cada compañía aseguradora tiene su propio porcentaje por rubro (por ejemplo, Automotor puede ser 15% pero Moto puede ser 10%, según lo que pague la aseguradora).'),
      bullet('Comisión calculada automáticamente en tiempo real (Prima × % comisión).'),
      italic('El productor puede modificar el porcentaje libremente en cada póliza. Si algún campo no está completo o es inválido, el sistema lo resalta en rojo con un mensaje explicativo antes de guardar.'),

      // ─── 3.8 COMISIONES ───────────────────────────────────────
      spacer(),
      h2('3.8  Análisis de Comisiones'),
      body('Vista de rendimiento económico de la cartera. El productor puede ver en un solo lugar cuánto está ganando y cerrar su período mensual.'),
      spacer(),
      h3('Porcentajes configurables por compañía y rubro:'),
      body('Cada compañía aseguradora paga un porcentaje distinto según el tipo de póliza. Por ejemplo:'),
      bullet('Sancor — Automotor: 15%'),
      bullet('Sancor — Moto: 10%'),
      bullet('Zurich — Hogar: 12%'),
      body('El productor puede definir y modificar estos porcentajes desde el sistema. Al cargar una póliza, el % se puede ajustar manualmente y la comisión se recalcula de forma automática.'),
      spacer(),
      h3('Cierre mensual de comisiones:'),
      bullet('Al final de cada mes, el productor puede realizar el "cierre mensual", que congela los datos de ese período para llevar un historial ordenado.'),
      bullet('Cada cierre queda guardado y se puede consultar en cualquier momento.'),
      bullet('Los cierres permiten comparar la evolución mes a mes de forma clara.'),
      spacer(),
      h3('Tarjetas de resumen:'),
      bullet('Comisión proyectada del mes (basada en renovaciones pendientes).'),
      bullet('Progreso hacia el objetivo mensual (barra de porcentaje).'),
      bullet('Comisión promedio por póliza.'),
      spacer(),
      h3('Gráficos:'),
      bullet('Gráfico de barras: evolución mensual de comisiones.'),
      bullet('Gráfico de torta: distribución de comisiones por rubro (Automotor, Hogar, Vida, Otros).'),
      spacer(),
      h3('Tabla de detalle mensual:'),
      bullet('Mes a mes: total de prima, comisión bruta y porcentaje de crecimiento respecto al mes anterior.'),
      spacer(),
      bullet('Exportación a Excel de todos los datos de comisiones.'),

      // ─── 3.9 REFERIDOS ────────────────────────────────────────
      spacer(),
      h2('3.9  Programa de Referidos'),
      body('Sistema de incentivos para que los productores recomienden la plataforma a sus colegas PAS.'),
      spacer(),
      h3('Código de referido:'),
      bullet('Cada usuario tiene un código único y personalizado.'),
      bullet('Se puede copiar con un clic o compartir directamente por WhatsApp o email.'),
      spacer(),
      h3('Beneficios por cantidad de referidos en el mes:'),
      bullet('1 referido → 10% de descuento en la próxima cuota.'),
      bullet('5 referidos → 50% de descuento en la próxima cuota.'),
      bullet('10 referidos → Mes 100% bonificado (gratis).'),
      spacer(),
      h3('Panel de estado:'),
      bullet('Contador de referidos del mes actual.'),
      bullet('Barra de progreso hacia el próximo objetivo.'),
      bullet('Total histórico de referidos desde la creación de la cuenta.'),
      italic('Los referidos se reinician el día 1 de cada mes.'),

      // ─── 3.10 PLANES Y PAGOS ──────────────────────────────────
      spacer(),
      h2('3.10  Suscripción y Pagos'),
      body('Sección donde el productor puede ver su plan actual, los planes disponibles y pagar dentro de la misma plataforma. Los pagos se procesan a través de MercadoPago y se aceptan: cupón de pago, débito CBU y tarjeta de crédito/débito.'),
      spacer(),
      h3('Planes disponibles:'),
      spacer(),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            headerCell('Plan', 15),
            headerCell('Precio', 18),
            headerCell('Límite', 30),
            headerCell('Incluye', 37),
          ]}),
          new TableRow({ children: [
            dataCell('Gratis'),
            dataCell('$0 — 10 días'),
            dataCell('Ilimitado (prueba)'),
            dataCell('Todas las funciones habilitadas'),
          ]}),
          new TableRow({ children: [
            dataCell('Emprendedor', true),
            dataCell('$4.999/mes', true),
            dataCell('20 pólizas / 20 clientes / 20 empresas', true),
            dataCell('CRM, alertas WhatsApp y Email, gestión completa', true),
          ]}),
          new TableRow({ children: [
            dataCell('Profesional'),
            dataCell('$12.999/mes'),
            dataCell('100 pólizas / 100 clientes / 100 empresas'),
            dataCell('Todo Emprendedor + análisis de comisiones y cierres mensuales'),
          ]}),
          new TableRow({ children: [
            dataCell('Agencia', true),
            dataCell('$29.999/mes', true),
            dataCell('500 pólizas / 500 clientes / 500 empresas', true),
            dataCell('Todo Profesional + múltiples usuarios', true),
          ]}),
        ]
      }),

      spacer(),
      h3('Funcionalidades:'),
      bullet('Al hacer clic en "Seleccionar", el sistema redirige a MercadoPago para completar el pago.'),
      bullet('Métodos de pago aceptados: cupón de pago, débito CBU, tarjeta de crédito o débito.'),
      bullet('El plan "Profesional" aparece destacado como "Más popular".'),
      bullet('Se muestra el estado de la cuenta: plan actual, fecha de vencimiento y días restantes.'),
      bullet('Historial de pagos realizados.'),

      // ─── 3.11 MI PERFIL ────────────────────────────────────────
      spacer(),
      h2('3.11  Mi Perfil'),
      body('Sección donde el productor puede actualizar su información personal y de contacto.'),
      spacer(),
      h3('Datos editables:'),
      bullet('Foto de perfil (carga desde el dispositivo).'),
      bullet('Nombre completo'),
      bullet('Correo electrónico'),
      bullet('Teléfono de contacto'),
      bullet('Dirección de oficina'),
      spacer(),
      h3('Información fija visible:'),
      bullet('Número de matrícula PAS.'),
      bullet('Último inicio de sesión.'),
      bullet('Opción de cambiar contraseña.'),
      italic('Al guardar los cambios, el sistema confirma la actualización con un mensaje verde en pantalla.'),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════
      // 4. FLUJOS PRINCIPALES
      // ══════════════════════════════════════════════════════════
      h1('  4.  FLUJOS PRINCIPALES'),
      spacer(),

      h2('Flujo 1 — Registrarse e ingresar por primera vez'),
      bullet('1. El productor entra a la URL de la plataforma.'),
      bullet('2. Hace clic en "Registrarse" e ingresa nombre, email y contraseña.'),
      bullet('3. Accede automáticamente con 10 días de prueba gratuita (todas las funciones activas).'),
      bullet('4. Es redirigido al Dashboard con su cartera vacía.'),
      spacer(),

      h2('Flujo 2 — Cargar una póliza nueva'),
      bullet('1. Desde el menú, hace clic en "Pólizas".'),
      bullet('2. Completa el formulario: datos del cliente, aseguradora, rubro, fechas y prima.'),
      bullet('3. El sistema calcula la comisión automáticamente.'),
      bullet('4. Hace clic en "Guardar". La póliza aparece en el Dashboard y en la sección correspondiente.'),
      spacer(),

      h2('Flujo 3 — Aviso de vencimiento por WhatsApp o Email'),
      bullet('1. El productor ve en el Dashboard que una póliza "Vence pronto".'),
      bullet('2. Hace clic en el ícono de WhatsApp o Email en esa fila.'),
      bullet('3. Se abre WhatsApp Web/móvil (o el cliente de correo) con un mensaje pre-armado dirigido al cliente.'),
      bullet('4. El productor lo envía con un clic.'),
      spacer(),

      h2('Flujo 4 — Suscribirse a un plan pago'),
      bullet('1. El productor entra a "Suscripción".'),
      bullet('2. Elige el plan (Emprendedor, Profesional o Agencia).'),
      bullet('3. Hace clic en "Seleccionar". El sistema lo redirige a MercadoPago.'),
      bullet('4. Completa el pago. Al volver, su plan queda activo automáticamente.'),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════
      // 5. LO QUE NO ESTÁ INCLUIDO
      // ══════════════════════════════════════════════════════════
      h1('  5.  FUERA DEL ALCANCE'),
      spacer(),
      body('Las siguientes funcionalidades NO están incluidas en ninguna de las dos opciones cotizadas, y requerirían una cotización adicional:'),
      spacer(),
      bullet('Aplicación móvil nativa (iOS / Android).'),
      bullet('Envío automático de emails o WhatsApp (bot automatizado).'),
      bullet('Integración con sistemas de aseguradoras externas.'),
      bullet('Módulo contable o de facturación.'),
      bullet('Reportes en PDF (solo Excel está contemplado en la opción Pro).'),
      bullet('Multi-idioma (la plataforma está en español únicamente).'),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════════════════════
      // 6. GLOSARIO
      // ══════════════════════════════════════════════════════════
      h1('  6.  GLOSARIO'),
      spacer(),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [ headerCell('Término', 25), headerCell('Definición', 75) ]}),
          new TableRow({ children: [ dataCell('PAS'), dataCell('Productor Asesor de Seguros. Usuario principal de la plataforma.') ]}),
          new TableRow({ children: [ dataCell('Póliza', true), dataCell('Contrato de seguro entre una persona/empresa y una aseguradora.', true) ]}),
          new TableRow({ children: [ dataCell('Prima'), dataCell('Monto que paga el asegurado por su póliza (mensual, semestral o anual).') ]}),
          new TableRow({ children: [ dataCell('Comisión', true), dataCell('Porcentaje de la prima que percibe el productor como honorario.', true) ]}),
          new TableRow({ children: [ dataCell('Cierre mensual'), dataCell('Proceso de cierre del período para registrar las comisiones del mes.') ]}),
          new TableRow({ children: [ dataCell('ART', true), dataCell('Aseguradora de Riesgos del Trabajo. Cubre accidentes laborales.', true) ]}),
          new TableRow({ children: [ dataCell('TRO'), dataCell('Todo Riesgo Operativo. Seguro integral para empresas.') ]}),
          new TableRow({ children: [ dataCell('MercadoPago', true), dataCell('Plataforma de pagos en línea usada para gestionar las suscripciones.', true) ]}),
          new TableRow({ children: [ dataCell('Dashboard'), dataCell('Panel de control con resumen visual de toda la información.') ]}),
        ]
      }),

      spacer(2),

      // ── Pie de documento ──────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: '─────────────────────────────────────────────────────────────────', color: MEDIUM, size: 18 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Documento preparado para el cliente  |  PAS Alert — Insurance Tech  |  Marzo 2026', size: 18, color: MEDIUM, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Este documento es de carácter confidencial y está dirigido exclusivamente al cliente al que fue entregado.', size: 18, color: MEDIUM, italics: true })],
        alignment: AlignmentType.CENTER,
      }),

    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  writeFileSync('PAS_Alert_PRD.docx', buffer);
  console.log('✓ Archivo generado: PAS_Alert_PRD.docx');
});
