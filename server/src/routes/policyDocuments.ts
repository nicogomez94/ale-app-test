import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { readPolicyDocumentPdf } from "../lib/policyDocumentStorage.js";

export const policyDocumentsRouter = Router();

policyDocumentsRouter.get("/:policyGroupId/download", async (req: AuthRequest, res: Response) => {
  try {
    const document = await prisma.policyDocument.findUnique({
      where: {
        userId_policyGroupId: {
          userId: req.userId!,
          policyGroupId: req.params.policyGroupId,
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "document_not_found", message: "La póliza no tiene PDF original asociado." });
      return;
    }

    const file = await readPolicyDocumentPdf(document.storageKey);
    const asciiName = document.originalName.replace(/[^a-zA-Z0-9._-]/g, "_") || "poliza.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(file.length));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(document.originalName)}`
    );
    res.send(file);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      res.status(410).json({ error: "document_file_missing", message: "El PDF original ya no está disponible." });
      return;
    }
    console.error("Download policy document error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo descargar el PDF original." });
  }
});
