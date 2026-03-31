import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { generateToken, authMiddleware, AuthRequest } from "../middleware/auth.js";

export const authRouter = Router();

// Register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password || !nombre) {
      res.status(400).json({ error: "Email, contraseña y nombre son requeridos" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "El email ya está registrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const now = new Date();
    const trialFin = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days trial

    const referralCode = `PAS-${nombre.split(" ")[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        plan: "TRIAL",
        trialInicio: now,
        trialFin,
        planVencimiento: trialFin,
        referralCode,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        plan: user.plan,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        planVencimiento: user.planVencimiento,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña son requeridos" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    // Check subscription status
    const now = new Date();
    if (user.planVencimiento && user.planVencimiento < now && user.plan !== "TRIAL") {
      await prisma.user.update({
        where: { id: user.id },
        data: { estado: "INACTIVO" },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: now },
    });

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        plan: user.plan,
        estado: user.estado,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        planVencimiento: user.planVencimiento,
        telefono: user.telefono,
        direccion: user.direccion,
        matriculaPas: user.matriculaPas,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get current user
authRouter.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
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
        isAdmin: true,
        plan: true,
        planVencimiento: true,
        trialFin: true,
        estado: true,
        referralCode: true,
        referidosMes: true,
        referidosTotales: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
