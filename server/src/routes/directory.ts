import { Router, Response } from "express";
import * as XLSX from "xlsx";
import prisma from "../lib/prisma.js";
import { decryptPortalPassword, encryptPortalPassword } from "../lib/portalCredentials.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const directoryRouter = Router();
directoryRouter.use(authMiddleware);

const BROKER_COLORS = new Set([
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be123c",
  "#4b5563",
]);

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asRequiredText(value: unknown): string {
  return asText(value) || "";
}

function uniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())));
}

async function ensureOwnedInsurers(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const count = await prisma.insuranceCompany.count({ where: { userId, id: { in: ids } } });
  if (count !== ids.length) {
    throw new Error("Una o mas aseguradoras seleccionadas no pertenecen al usuario");
  }
}

async function ensureOwnedBrokers(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const count = await prisma.broker.count({ where: { userId, id: { in: ids } } });
  if (count !== ids.length) {
    throw new Error("Uno o mas brokers seleccionados no pertenecen al usuario");
  }
}

function serializeInsurer(insurer: any) {
  const invoices = insurer.commissionInvoices || [];
  const totalFacturadoARS = invoices
    .filter((invoice: any) => invoice.moneda === "ARS")
    .reduce((sum: number, invoice: any) => sum + Number(invoice.monto || 0), 0);
  const totalFacturadoUSD = invoices
    .filter((invoice: any) => invoice.moneda === "USD")
    .reduce((sum: number, invoice: any) => sum + Number(invoice.monto || 0), 0);

  return {
    id: insurer.id,
    razonSocial: insurer.razonSocial,
    cuit: insurer.cuit,
    domicilioComercial: insurer.domicilioComercial,
    ivaCondition: insurer.ivaCondition,
    email: insurer.email,
    telefono: insurer.telefono,
    websiteUrl: insurer.websiteUrl,
    portalLoginUrl: insurer.portalLoginUrl,
    portalUsername: insurer.portalUsername,
    hasPortalPassword: Boolean(insurer.portalPasswordEncrypted),
    producerCode: insurer.producerCode,
    notes: insurer.notes,
    createdAt: insurer.createdAt,
    updatedAt: insurer.updatedAt,
    brokers: (insurer.brokerLinks || []).map((link: any) => link.broker),
    totalFacturadoARS,
    totalFacturadoUSD,
    cantidadFacturas: invoices.length,
    invoices: invoices.map((invoice: any) => ({
      ...invoice,
      fechaEmision: invoice.fechaEmision?.toISOString().split("T")[0] || "",
    })),
  };
}

function serializeBroker(broker: any) {
  return {
    id: broker.id,
    nombre: broker.nombre,
    color: broker.color,
    contactoNombre: broker.contactoNombre,
    email: broker.email,
    telefono: broker.telefono,
    createdAt: broker.createdAt,
    updatedAt: broker.updatedAt,
    insurers: (broker.insurerLinks || []).map((link: any) => link.insuranceCompany),
  };
}

const insurerInclude = {
  brokerLinks: {
    include: {
      broker: {
        select: {
          id: true,
          nombre: true,
          color: true,
          contactoNombre: true,
          email: true,
          telefono: true,
        },
      },
    },
  },
  commissionInvoices: {
    select: {
      id: true,
      periodo: true,
      numeroFactura: true,
      fechaEmision: true,
      monto: true,
      moneda: true,
      estado: true,
    },
  },
};

const brokerInclude = {
  insurerLinks: {
    include: {
      insuranceCompany: {
        select: {
          id: true,
          razonSocial: true,
          cuit: true,
          websiteUrl: true,
          portalLoginUrl: true,
        },
      },
    },
  },
};

directoryRouter.get("/insurers", async (req: AuthRequest, res: Response) => {
  try {
    const search = asText(req.query.search);
    const insurers = await prisma.insuranceCompany.findMany({
      where: {
        userId: req.userId!,
        ...(search
          ? {
              OR: [
                { razonSocial: { contains: search, mode: "insensitive" } },
                { cuit: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { razonSocial: "asc" },
      include: insurerInclude,
    });

    res.json(insurers.map(serializeInsurer));
  } catch (error) {
    console.error("List insurers error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

directoryRouter.get("/insurers/export", async (req: AuthRequest, res: Response) => {
  try {
    const insurers = await prisma.insuranceCompany.findMany({
      where: { userId: req.userId! },
      orderBy: { razonSocial: "asc" },
      include: insurerInclude,
    });

    const data = insurers.map((insurer: any) => {
      const item = serializeInsurer(insurer);
      return {
        "Razon Social": item.razonSocial,
        CUIT: item.cuit,
        Domicilio: item.domicilioComercial || "",
        IVA: item.ivaCondition || "",
        Email: item.email || "",
        Telefono: item.telefono || "",
        Web: item.websiteUrl || "",
        "Login PAS": item.portalLoginUrl || "",
        "Codigo Productor": item.producerCode || "",
        Brokers: item.brokers.map((broker: any) => broker.nombre).join(", "),
        "Facturado ARS": item.totalFacturadoARS,
        "Facturado USD": item.totalFacturadoUSD,
        Facturas: item.cantidadFacturas,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aseguradoras");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Aseguradoras_PAS_Alert.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export insurers error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

directoryRouter.post("/insurers", async (req: AuthRequest, res: Response) => {
  try {
    const brokerIds = uniqueStringArray(req.body?.brokerIds);
    await ensureOwnedBrokers(req.userId!, brokerIds);

    const razonSocial = asRequiredText(req.body?.razonSocial);
    const cuit = asRequiredText(req.body?.cuit);
    if (!razonSocial || !cuit) {
      res.status(400).json({ error: "Razon social y CUIT son requeridos" });
      return;
    }

    const portalPassword = asText(req.body?.portalPassword);
    const created = await prisma.insuranceCompany.create({
      data: {
        userId: req.userId!,
        razonSocial,
        cuit,
        domicilioComercial: asText(req.body?.domicilioComercial),
        ivaCondition: asText(req.body?.ivaCondition),
        email: asText(req.body?.email),
        telefono: asText(req.body?.telefono),
        websiteUrl: asText(req.body?.websiteUrl),
        portalLoginUrl: asText(req.body?.portalLoginUrl),
        portalUsername: asText(req.body?.portalUsername),
        portalPasswordEncrypted: portalPassword ? encryptPortalPassword(portalPassword) : null,
        producerCode: asText(req.body?.producerCode),
        notes: asText(req.body?.notes),
        brokerLinks: {
          create: brokerIds.map((brokerId) => ({ brokerId })),
        },
      },
      include: insurerInclude,
    });

    res.status(201).json(serializeInsurer(created));
  } catch (error) {
    console.error("Create insurer error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("PORTAL_CREDENTIAL_SECRET") || message.includes("pertenecen") ? 400 : 500).json({ error: message });
  }
});

directoryRouter.put("/insurers/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.insuranceCompany.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) {
      res.status(404).json({ error: "Aseguradora no encontrada" });
      return;
    }

    const brokerIds = Array.isArray(req.body?.brokerIds) ? uniqueStringArray(req.body.brokerIds) : undefined;
    if (brokerIds) await ensureOwnedBrokers(req.userId!, brokerIds);

    const razonSocial = asRequiredText(req.body?.razonSocial);
    const cuit = asRequiredText(req.body?.cuit);
    if (!razonSocial || !cuit) {
      res.status(400).json({ error: "Razon social y CUIT son requeridos" });
      return;
    }

    const portalPasswordData =
      asText(req.body?.portalPassword)
        ? { portalPasswordEncrypted: encryptPortalPassword(asText(req.body.portalPassword)!) }
        : req.body?.clearPortalPassword === true
          ? { portalPasswordEncrypted: null }
          : {};

    const updated = await prisma.$transaction(async (tx) => {
      if (brokerIds) {
        await tx.brokerInsuranceCompany.deleteMany({ where: { insuranceCompanyId: id } });
        if (brokerIds.length > 0) {
          await tx.brokerInsuranceCompany.createMany({
            data: brokerIds.map((brokerId) => ({ brokerId, insuranceCompanyId: id })),
          });
        }
      }

      return tx.insuranceCompany.update({
        where: { id },
        data: {
          razonSocial,
          cuit,
          domicilioComercial: asText(req.body?.domicilioComercial),
          ivaCondition: asText(req.body?.ivaCondition),
          email: asText(req.body?.email),
          telefono: asText(req.body?.telefono),
          websiteUrl: asText(req.body?.websiteUrl),
          portalLoginUrl: asText(req.body?.portalLoginUrl),
          portalUsername: asText(req.body?.portalUsername),
          producerCode: asText(req.body?.producerCode),
          notes: asText(req.body?.notes),
          ...portalPasswordData,
        },
        include: insurerInclude,
      });
    });

    res.json(serializeInsurer(updated));
  } catch (error) {
    console.error("Update insurer error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("PORTAL_CREDENTIAL_SECRET") || message.includes("pertenecen") ? 400 : 500).json({ error: message });
  }
});

directoryRouter.get("/insurers/:id/portal-password", async (req: AuthRequest, res: Response) => {
  try {
    const insurer = await prisma.insuranceCompany.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { portalPasswordEncrypted: true },
    });

    if (!insurer) {
      res.status(404).json({ error: "Aseguradora no encontrada" });
      return;
    }

    if (!insurer.portalPasswordEncrypted) {
      res.json({ password: "" });
      return;
    }

    res.json({ password: decryptPortalPassword(insurer.portalPasswordEncrypted) });
  } catch (error) {
    console.error("Reveal portal password error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("PORTAL_CREDENTIAL_SECRET") ? 400 : 500).json({ error: message });
  }
});

directoryRouter.delete("/insurers/:id", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.insuranceCompany.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Aseguradora no encontrada" });
      return;
    }

    await prisma.insuranceCompany.delete({ where: { id: req.params.id } });
    res.json({ message: "Aseguradora eliminada" });
  } catch (error) {
    console.error("Delete insurer error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

directoryRouter.get("/brokers", async (req: AuthRequest, res: Response) => {
  try {
    const search = asText(req.query.search);
    const brokers = await prisma.broker.findMany({
      where: {
        userId: req.userId!,
        ...(search
          ? {
              OR: [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { nombre: "asc" },
      include: brokerInclude,
    });

    res.json(brokers.map(serializeBroker));
  } catch (error) {
    console.error("List brokers error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

directoryRouter.get("/brokers/export", async (req: AuthRequest, res: Response) => {
  try {
    const brokers = await prisma.broker.findMany({
      where: { userId: req.userId! },
      orderBy: { nombre: "asc" },
      include: brokerInclude,
    });

    const data = brokers.map((broker: any) => {
      const item = serializeBroker(broker);
      return {
        Broker: item.nombre,
        Color: item.color,
        Contacto: item.contactoNombre || "",
        Email: item.email || "",
        Aseguradoras: item.insurers.map((insurer: any) => insurer.razonSocial).join(", "),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Brokers");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Brokers_PAS_Alert.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export brokers error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

directoryRouter.post("/brokers", async (req: AuthRequest, res: Response) => {
  try {
    const insurerIds = uniqueStringArray(req.body?.insurerIds);
    await ensureOwnedInsurers(req.userId!, insurerIds);

    const nombre = asRequiredText(req.body?.nombre);
    if (!nombre) {
      res.status(400).json({ error: "Nombre de broker requerido" });
      return;
    }

    const color = asText(req.body?.color) || "#2563eb";
    const created = await prisma.broker.create({
      data: {
        userId: req.userId!,
        nombre,
        color: BROKER_COLORS.has(color) ? color : "#2563eb",
        contactoNombre: asText(req.body?.contactoNombre),
        email: asText(req.body?.email),
        telefono: asText(req.body?.telefono),
        insurerLinks: {
          create: insurerIds.map((insuranceCompanyId) => ({ insuranceCompanyId })),
        },
      },
      include: brokerInclude,
    });

    res.status(201).json(serializeBroker(created));
  } catch (error) {
    console.error("Create broker error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("pertenecen") ? 400 : 500).json({ error: message });
  }
});

directoryRouter.put("/brokers/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.broker.findFirst({ where: { id, userId: req.userId! }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ error: "Broker no encontrado" });
      return;
    }

    const insurerIds = Array.isArray(req.body?.insurerIds) ? uniqueStringArray(req.body.insurerIds) : undefined;
    if (insurerIds) await ensureOwnedInsurers(req.userId!, insurerIds);

    const nombre = asRequiredText(req.body?.nombre);
    if (!nombre) {
      res.status(400).json({ error: "Nombre de broker requerido" });
      return;
    }

    const color = asText(req.body?.color) || "#2563eb";
    const updated = await prisma.$transaction(async (tx) => {
      if (insurerIds) {
        await tx.brokerInsuranceCompany.deleteMany({ where: { brokerId: id } });
        if (insurerIds.length > 0) {
          await tx.brokerInsuranceCompany.createMany({
            data: insurerIds.map((insuranceCompanyId) => ({ brokerId: id, insuranceCompanyId })),
          });
        }
      }

      return tx.broker.update({
        where: { id },
        data: {
          nombre,
          color: BROKER_COLORS.has(color) ? color : "#2563eb",
          contactoNombre: asText(req.body?.contactoNombre),
          email: asText(req.body?.email),
          telefono: asText(req.body?.telefono),
        },
        include: brokerInclude,
      });
    });

    res.json(serializeBroker(updated));
  } catch (error) {
    console.error("Update broker error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("pertenecen") ? 400 : 500).json({ error: message });
  }
});

directoryRouter.delete("/brokers/:id", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.broker.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Broker no encontrado" });
      return;
    }

    await prisma.broker.delete({ where: { id: req.params.id } });
    res.json({ message: "Broker eliminado" });
  } catch (error) {
    console.error("Delete broker error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
