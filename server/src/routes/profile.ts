import { Router, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const profileRouter = Router();
profileRouter.use(authMiddleware);

// Get profile
profileRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        telefono: true,
        direccion: true,
        avatar: true,
        matriculaPas: true,
        lastLogin: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update profile
profileRouter.put("/", async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, email, telefono, direccion, avatar } = req.body;

    // If email changes, check uniqueness
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: req.userId } },
      });
      if (existing) {
        res.status(409).json({ error: "El email ya está en uso" });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        nombre,
        email,
        telefono,
        direccion,
        avatar,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        telefono: true,
        direccion: true,
        avatar: true,
        matriculaPas: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Change password
profileRouter.put("/password", async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Contraseña actual y nueva son requeridas" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      res.status(401).json({ error: "Contraseña actual incorrecta" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
