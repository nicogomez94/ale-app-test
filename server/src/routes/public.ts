import { Router } from "express";
import multer from "multer";
import prisma from "../lib/prisma.js";

export const publicRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Formato de CV no permitido. Solo PDF, DOC o DOCX."));
      return;
    }
    cb(null, true);
  },
});

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

publicRouter.post("/contacto", async (req, res) => {
  try {
    const nombre = asText(req.body.nombre);
    const email = asText(req.body.email);
    const telefono = asText(req.body.telefono);
    const asunto = asText(req.body.asunto);
    const mensaje = asText(req.body.mensaje);

    if (!nombre || !email || !asunto || !mensaje) {
      res.status(400).json({ error: "Faltan campos obligatorios." });
      return;
    }

    await prisma.landingContactLead.create({
      data: {
        nombre,
        email,
        telefono: telefono || null,
        asunto,
        mensaje,
      },
    });

    res.status(201).json({ message: "Consulta recibida correctamente." });
  } catch (error) {
    console.error("Public contacto error:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

publicRouter.post("/productores", (req, res) => {
  upload.single("cv")(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "El CV supera el máximo de 5MB." });
      return;
    }

    if (err) {
      res.status(400).json({ error: err.message || "No se pudo procesar el archivo." });
      return;
    }

    try {
      const nombre = asText(req.body.nombre);
      const email = asText(req.body.email);
      const telefono = asText(req.body.telefono);
      const provincia = asText(req.body.provincia);
      const experiencia = asText(req.body.experiencia);
      const mensaje = asText(req.body.mensaje);
      const file = req.file;

      if (!nombre || !email || !telefono) {
        res.status(400).json({ error: "Faltan campos obligatorios." });
        return;
      }

      await prisma.landingProducerLead.create({
        data: {
          nombre,
          email,
          telefono,
          provincia: provincia || null,
          experiencia: experiencia || null,
          mensaje: mensaje || null,
          cvOriginalName: file?.originalname || null,
          cvMimeType: file?.mimetype || null,
          cvSizeBytes: file ? file.size : null,
          cvContent: file?.buffer || null,
        },
      });

      res.status(201).json({ message: "Consulta de productor recibida correctamente." });
    } catch (error) {
      console.error("Public productores error:", error);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });
});
