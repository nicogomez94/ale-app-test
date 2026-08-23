import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const toolsRouter = Router();
toolsRouter.use(authMiddleware);

toolsRouter.get("/messages", async (req: AuthRequest, res: Response) => {
  const items = await prisma.messageTemplate.findMany({
    where: { userId: req.userId },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });
  res.json(items);
});

toolsRouter.post("/messages", async (req: AuthRequest, res: Response) => {
  const { nombre, categoria, contenido } = req.body;
  if (!String(nombre || "").trim() || !String(contenido || "").trim()) {
    res.status(400).json({ error: "Nombre y mensaje son obligatorios" });
    return;
  }
  const item = await prisma.messageTemplate.create({
    data: { userId: req.userId!, nombre: String(nombre).trim(), categoria: String(categoria || "GENERAL"), contenido: String(contenido).trim() },
  });
  res.status(201).json(item);
});

toolsRouter.put("/messages/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.messageTemplate.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) { res.status(404).json({ error: "Mensaje no encontrado" }); return; }
  const item = await prisma.messageTemplate.update({
    where: { id: existing.id },
    data: { nombre: String(req.body.nombre || existing.nombre).trim(), categoria: String(req.body.categoria || existing.categoria), contenido: String(req.body.contenido || existing.contenido).trim() },
  });
  res.json(item);
});

toolsRouter.delete("/messages/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.messageTemplate.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) { res.status(404).json({ error: "Mensaje no encontrado" }); return; }
  await prisma.messageTemplate.delete({ where: { id: existing.id } });
  res.json({ message: "Mensaje eliminado" });
});

toolsRouter.get("/suggestions", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isAdmin: true } });
  const items = await prisma.suggestion.findMany({
    where: user?.isAdmin ? {} : { userId: req.userId },
    include: user?.isAdmin ? { user: { select: { nombre: true, email: true } } } : undefined,
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

toolsRouter.post("/suggestions", async (req: AuthRequest, res: Response) => {
  const { asunto, mensaje } = req.body;
  if (!String(asunto || "").trim() || !String(mensaje || "").trim()) {
    res.status(400).json({ error: "Asunto y mensaje son obligatorios" });
    return;
  }
  const item = await prisma.suggestion.create({ data: { userId: req.userId!, asunto: String(asunto).trim(), mensaje: String(mensaje).trim() } });
  res.status(201).json(item);
});

toolsRouter.put("/suggestions/:id/reply", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isAdmin: true } });
  if (!user?.isAdmin) { res.status(403).json({ error: "Solo administradores" }); return; }
  const respuesta = String(req.body.respuesta || "").trim();
  const item = await prisma.suggestion.update({
    where: { id: req.params.id },
    data: { respuesta, estado: respuesta ? "RESPONDIDA" : "EN_REVISION", respondedAt: respuesta ? new Date() : null },
  });
  res.json(item);
});
