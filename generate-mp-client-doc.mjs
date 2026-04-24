import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import fs from "fs";

const OUTPUT = "PAS_Alert_Mercado_Pago_Guia_Cliente_Simple.docx";
const font = "Calibri";

const LINKS = {
  developers: "https://www.mercadopago.com.ar/developers/es",
  webhookDocs: "https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks",
};

const VALUES = {
  webhookUrl: "https://pas-alert-api.onrender.com/api/subscriptions/webhook",
  events: [
    "payment",
    "subscription_preapproval",
    "subscription_authorized_payment",
    "subscription_preapproval_plan",
  ],
};

const title = (text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 240 },
    children: [new TextRun({ text, bold: true, size: 34, font, color: "16324F" })],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font, color: "1D4ED8" })],
  });

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: 20, after: 80 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        font,
        size: 22,
        bold: opts.bold || false,
        color: opts.color || "0F172A",
      }),
    ],
  });

const n = (number, text) =>
  new Paragraph({
    spacing: { before: 20, after: 50 },
    children: [
      new TextRun({ text: `${number}. `, bold: true, font, size: 22, color: "1D4ED8" }),
      new TextRun({ text, font, size: 22, color: "0F172A" }),
    ],
  });

const bullet = (text) =>
  new Paragraph({
    spacing: { before: 10, after: 30 },
    bullet: { level: 0 },
    children: [new TextRun({ text, font, size: 22, color: "0F172A" })],
  });

const doc = new Document({
  creator: "Codex",
  title: "Guia simple para configurar Mercado Pago",
  sections: [
    {
      children: [
        title("Guia simple para configurar Mercado Pago"),
        p("Segui estos pasos exactamente. No hace falta entender nada tecnico. Solo entrar, hacer click donde se indica y guardar.", {
          align: AlignmentType.CENTER,
          color: "475569",
        }),

        h1("1. Entrar a Mercado Pago Developers"),
        n(1, `Abrí este link: ${LINKS.developers}`),
        n(2, "Iniciá sesión con la cuenta del negocio."),
        n(3, "Una vez adentro, buscá arriba a la derecha la opción “Tus integraciones” o “Your integrations”."),
        n(4, "Hacé click ahí."),

        h1("2. Abrir la aplicación correcta"),
        n(5, "Dentro de “Tus integraciones”, buscá la aplicación del negocio."),
        n(6, "Hacé click en la aplicación."),
        n(7, "Si no la ves enseguida, buscá un botón como “Ver todas” o “View all” y entrá ahí."),
        p("Si no aparece ninguna aplicación, avisame antes de seguir.", { bold: true, color: "B45309" }),

        h1("3. Ir a Webhooks"),
        n(8, "Dentro de la aplicación, buscá la sección “Notificaciones” o “Notifications”."),
        n(9, "Entrá en “Webhooks”."),
        n(10, "Buscá el campo donde pide la URL del webhook."),

        h1("4. Pegar esta URL"),
        p(VALUES.webhookUrl, { bold: true, color: "15803D" }),
        n(11, "Copiá esa URL exactamente como está."),
        n(12, "Pegala en el campo de Webhook URL."),

        h1("5. Marcar estos eventos"),
        p("En la misma pantalla, marcá estos eventos:", { bold: true }),
        ...VALUES.events.map((event) => bullet(event)),
        n(13, "Revisá que esos cuatro estén seleccionados."),
        n(14, "Después hacé click en “Guardar” o “Save”."),

        h1("6. Si aparece una clave secreta"),
        n(15, "Si al guardar aparece una “secret key”, “clave secreta” o algo parecido, copiala."),
        n(16, "Mandamela por WhatsApp junto con una captura de pantalla de cómo quedó configurado."),

        h1("7. Qué me tenés que mandar al terminar"),
        bullet("Una captura de la pantalla final."),
        bullet("La secret key, si Mercado Pago la muestra."),
        bullet("Nada más."),

        h1("8. Si te perdés"),
        p(`Si en algún momento no encontrás una opción, abrí este link oficial de ayuda de Mercado Pago: ${LINKS.webhookDocs}`),
        p("Si aun así no lo encontrás, mandame captura de la pantalla donde estás y te digo exactamente dónde tocar.", {
          bold: true,
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUTPUT, buffer);
console.log(`Documento generado: ${OUTPUT}`);
