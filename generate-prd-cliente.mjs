import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { writeFileSync } from 'fs';

const title = (text) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: 34 })],
    spacing: { before: 120, after: 120 },
  });

const h1 = (text) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: '1A237E' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
  });

const p = (text) =>
  new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 40, after: 40 },
  });

const bullet = (text) =>
  new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { before: 20, after: 20 },
  });

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22 },
        paragraph: { spacing: { line: 276 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'PRD DE REFERENCIA FUNCIONAL', bold: true, size: 40, color: '1A237E' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'PAS Alert (App de prueba recibida)', size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Fecha de relevamiento: 28 de marzo de 2026', size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 300 },
        }),
        p('Objetivo de este documento: dejar por escrito, en lenguaje simple, todas las funcionalidades visibles en el prototipo para poder replicarlo de forma exactamente igual.'),

        h1('1. Alcance'),
        p('Este PRD describe el comportamiento actual del prototipo. La meta es copiar la app tal como está hoy, sin agregar mejoras ni cambiar flujos.'),
        bullet('Incluye: pantallas, botones, acciones, filtros, exportaciones y mensajes visibles para el usuario.'),
        bullet('No incluye: mejoras futuras ni cambios de diseño.'),

        h1('2. Recorrido general de la app'),
        bullet('Inicio de sesión con pantalla de acceso (email/contraseña o botón Google).'),
        bullet('Luego del login, se ve un panel con menú lateral y barra superior.'),
        bullet('Menú lateral: Dashboard, Clientes, Empresas, Vida y Finanzas, Pólizas, Comisiones, Referidos y Suscripción.'),
        bullet('Barra superior: fecha/hora en vivo, cambio claro/oscuro, campana de alertas y acceso a perfil/cierre de sesión.'),

        h1('3. Funcionalidades por módulo'),

        title('3.1 Login'),
        bullet('Formulario con correo y contraseña (con botón para mostrar/ocultar contraseña).'),
        bullet('Botón “Continuar con Google”.'),
        bullet('Botón “Iniciar sesión”.'),
        bullet('Ambos accesos llevan al panel principal.'),

        title('3.2 Dashboard'),
        bullet('Tarjetas de resumen (pólizas activas, próximas a vencer, vencidas y clientes totales).'),
        bullet('Botón “Nueva Póliza” que abre el formulario de alta.'),
        bullet('Tres tablas de pólizas: clientes, empresas, vida/finanzas.'),
        bullet('Cada fila muestra datos de póliza y permite abrir WhatsApp al cliente.'),
        bullet('Campana de alertas aplica filtro para ver solo pólizas que vencen en próximos 5 días.'),
        bullet('Bloque lateral con notificaciones y estado de referidos.'),

        title('3.3 Clientes'),
        bullet('Buscador por nombre o DNI.'),
        bullet('Botón “Exportar Excel” de la lista de clientes.'),
        bullet('Botón “Nuevo…” con 2 opciones: nuevo cliente individual o nueva empresa.'),
        bullet('Acciones por fila: WhatsApp, editar y eliminar (con confirmación).'),
        bullet('Formulario modal para alta/edición de cliente.'),

        title('3.4 Empresas'),
        bullet('Pestañas por tipo: ART, Flotas, TRO, Consorcio e Integral de Comercio.'),
        bullet('Buscador por razón social o CUIT.'),
        bullet('Botón “Exportar Excel” según pestaña activa.'),
        bullet('Alta/edición en modal con campos de empresa y datos de contacto.'),
        bullet('Acciones por fila: WhatsApp, editar y eliminar.'),

        title('3.5 Vida y Finanzas'),
        bullet('Pestañas: Seguros de Vida y Seguros de Retiro.'),
        bullet('Buscador por cliente o CUIT.'),
        bullet('Botón “Exportar Excel” según pestaña activa.'),
        bullet('Alta/edición en modal con campos que cambian por tipo (vida o retiro).'),
        bullet('Acciones por fila: WhatsApp, editar y eliminar.'),

        title('3.6 Nueva Póliza'),
        bullet('Formulario con datos de cliente y datos de póliza.'),
        bullet('Validaciones de campos obligatorios antes de guardar.'),
        bullet('Cálculo automático de comisión estimada (según prima y porcentaje).'),
        bullet('Al guardar, aparece mensaje de éxito.'),

        title('3.7 Comisiones'),
        bullet('Indicadores de rendimiento (comisión proyectada, objetivo y promedio).'),
        bullet('Gráfico de barras de evolución mensual.'),
        bullet('Gráfico de distribución por rubro.'),
        bullet('Tabla detalle por mes con totales.'),
        bullet('Exportación a Excel.'),

        title('3.8 Referidos'),
        bullet('Código personal de referido visible y copiable.'),
        bullet('Botones para compartir por WhatsApp o email.'),
        bullet('Tabla de beneficios por cantidad de referidos.'),
        bullet('Panel de progreso mensual y objetivo siguiente.'),

        title('3.9 Suscripción y Pagos'),
        bullet('Tarjetas de planes: Gratis, Emprendedor, Profesional y Agencia.'),
        bullet('Selección de plan pago para iniciar checkout externo.'),
        bullet('Tarjeta de estado de cuenta (plan actual y días restantes).'),
        bullet('Sección de historial de pagos.'),

        title('3.10 Perfil'),
        bullet('Edición de nombre, email, teléfono y dirección.'),
        bullet('Carga/cambio de foto de perfil.'),
        bullet('Guardado de cambios con mensaje de confirmación.'),

        h1('4. Reglas para replicar “exactamente igual”'),
        bullet('Mantener misma estructura de pantallas, menú y textos visibles.'),
        bullet('Mantener misma lógica de filtros, búsquedas, exportaciones y accesos a WhatsApp.'),
        bullet('Mantener misma oferta de planes y flujo de selección de plan.'),
        bullet('Respetar qué acciones hoy son solo demostrativas (por ejemplo, se abre un formulario pero no siempre guarda cambios reales en lista).'),
        bullet('No cambiar nombres de secciones ni orden de navegación.'),

        h1('5. Checklist de aceptación (cliente)'),
        bullet('Se puede ingresar y salir de la app como en el prototipo.'),
        bullet('Se ven las mismas secciones del menú, en el mismo orden.'),
        bullet('Dashboard muestra tablas, alertas y filtro por vencimiento.'),
        bullet('Clientes, Empresas y Vida/Finanzas tienen búsqueda, acciones y exportación Excel.'),
        bullet('Formulario de Nueva Póliza calcula comisión y muestra confirmación.'),
        bullet('Comisiones, Referidos, Suscripción y Perfil funcionan visualmente igual.'),
        bullet('El resultado final es reconocible como la misma app de prueba, sin diferencias funcionales para el usuario final.'),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const outputPath = 'PRD_PAS_Alert_Referencia_Cliente.docx';
writeFileSync(outputPath, buffer);
console.log(`Archivo generado: ${outputPath}`);
