import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
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

// Forgot password — generates a 6-digit code
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "El email es requerido" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      res.json({ message: "Si el email está registrado, recibirás un código de recuperación." });
      return;
    }

    // Generate 6-digit code
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // In production, send this via email. For now, log it.
    console.log(`\n=== CÓDIGO DE RECUPERACIÓN ===`);
    console.log(`Email: ${email}`);
    console.log(`Código: ${resetToken}`);
    console.log(`Expira: ${resetTokenExpiry.toLocaleString()}`);
    console.log(`==============================\n`);

    res.json({ message: "Si el email está registrado, recibirás un código de recuperación." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Reset password with code
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({ error: "Email, código y nueva contraseña son requeridos" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      res.status(400).json({ error: "Código inválido o expirado" });
      return;
    }

    if (user.resetToken !== code) {
      res.status(400).json({ error: "Código incorrecto" });
      return;
    }

    if (new Date() > user.resetTokenExpiry) {
      res.status(400).json({ error: "El código ha expirado. Solicita uno nuevo." });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
