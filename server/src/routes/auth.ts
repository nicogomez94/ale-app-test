import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { generateToken, authMiddleware, AuthRequest } from "../middleware/auth.js";
import { sendEmail } from "../lib/email.js";

export const authRouter = Router();

const DEFAULT_TRIAL_DAYS = 30;

const authUserSelect = {
  id: true,
  email: true,
  password: true,
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
  resetToken: true,
  resetTokenExpiry: true,
} as const;

function normalizeReferralCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

async function getReferrer(referralCode: unknown, referredEmail: string) {
  const code = normalizeReferralCode(referralCode);
  if (!code) return null;

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, email: true },
  });

  if (!referrer) throw new Error("INVALID_REFERRAL_CODE");
  if (referrer.email.toLowerCase() === referredEmail.toLowerCase()) {
    throw new Error("SELF_REFERRAL_CODE");
  }

  return referrer;
}

async function registerReferral(tx: any, referrerId: string, referredEmail: string, now: Date) {
  await tx.referral.create({
    data: {
      referrerId,
      referredEmail,
      status: "active",
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
    },
  });

  await tx.user.update({
    where: { id: referrerId },
    data: {
      referidosMes: { increment: 1 },
      referidosTotales: { increment: 1 },
    },
    select: { id: true },
  });
}

// Register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, nombre, referralCode: referredByCode } = req.body;

    if (!email || !password || !nombre) {
      res.status(400).json({ error: "Email, contraseña y nombre son requeridos" });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "El email ya está registrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const now = new Date();
    const trialFin = new Date(now.getTime() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const referralCode = `PAS-${nombre.split(" ")[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const referrer = await getReferrer(referredByCode, email);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
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
        select: {
          id: true,
          email: true,
          nombre: true,
          plan: true,
          isAdmin: true,
          referralCode: true,
          planVencimiento: true,
        },
      });

      if (referrer) {
        await registerReferral(tx, referrer.id, email, now);
      }

      return created;
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
  } catch (error: any) {
    if (error.message === "INVALID_REFERRAL_CODE") {
      res.status(400).json({ error: "Código de referido inválido" });
      return;
    }
    if (error.message === "SELF_REFERRAL_CODE") {
      res.status(400).json({ error: "No podés usar tu propio código de referido" });
      return;
    }
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: authUserSelect,
    });
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
    if (!user.isAdmin && user.planVencimiento && user.planVencimiento < now && user.plan !== "TRIAL") {
      await prisma.user.update({
        where: { id: user.id },
        data: { estado: "INACTIVO" },
        select: { id: true },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: now },
      select: { id: true },
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nombre: true,
      },
    });
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
      select: { id: true },
    });

    // Send recovery code via email (fire-and-forget — never fail the HTTP response)
    sendEmail({
      name: user.nombre,
      email: user.email,
      to: user.email,
      message: `Tu código de recuperación de contraseña es: ${resetToken}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este código, ignorá este mensaje.`,
    }).catch((err) => {
      console.error("Error enviando email de recuperación:", err);
      // Fallback for dev environments
      console.log(`[DEV] Código de recuperación para ${email}: ${resetToken}`);
    });

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

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

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
      select: { id: true },
    });

    res.json({ message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Google OAuth — verify Firebase ID token and create/login user
authRouter.post("/google", async (req: Request, res: Response) => {
  try {
    const { idToken, nombre, email, photoURL, referralCode: referredByCode } = req.body;

    if (!idToken || !email) {
      res.status(400).json({ error: "Token e email son requeridos" });
      return;
    }

    // Verify the Firebase ID token by calling Firebase's tokeninfo endpoint
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!verifyRes.ok) {
      res.status(401).json({ error: "Token de Google inválido" });
      return;
    }

    const tokenData = await verifyRes.json() as any;

    // Validate token audience matches our Google Client ID
    const allowedAudiences = (process.env.GOOGLE_CLIENT_ID || "").split(",").map(s => s.trim()).filter(Boolean);
    if (allowedAudiences.length > 0 && !allowedAudiences.includes(tokenData.aud)) {
      res.status(401).json({ error: "Token de Google inválido" });
      return;
    }

    // Verify the email matches
    if (tokenData.email !== email) {
      res.status(401).json({ error: "Token de Google inválido" });
      return;
    }

    const now = new Date();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nombre: true,
        plan: true,
        isAdmin: true,
        estado: true,
        avatar: true,
        referralCode: true,
        planVencimiento: true,
        telefono: true,
        direccion: true,
        matriculaPas: true,
      },
    });

    if (!user) {
      // Create new user with a random secure password (they'll use Google to login)
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      const trialFin = new Date(now.getTime() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const displayName = nombre || email.split("@")[0];
      const referralCode = `PAS-${displayName.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Date.now().toString(36).toUpperCase()}`;
      const referrer = await getReferrer(referredByCode, email);

      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            password: randomPassword,
            nombre: displayName,
            avatar: photoURL ?? null,
            plan: "TRIAL",
            trialInicio: now,
            trialFin,
            planVencimiento: trialFin,
            referralCode,
          },
          select: {
            id: true,
            email: true,
            nombre: true,
            plan: true,
            isAdmin: true,
            estado: true,
            avatar: true,
            referralCode: true,
            planVencimiento: true,
            telefono: true,
            direccion: true,
            matriculaPas: true,
          },
        });

        if (referrer) {
          await registerReferral(tx, referrer.id, email, now);
        }

        return created;
      });
    } else {
      // Update last login and avatar if available
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: now,
          ...(photoURL && !user.avatar ? { avatar: photoURL } : {}),
        },
        select: { id: true },
      });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        plan: user.plan,
        isAdmin: user.isAdmin,
        estado: user.estado,
        avatar: user.avatar,
        referralCode: user.referralCode,
        planVencimiento: user.planVencimiento,
        telefono: user.telefono,
        direccion: user.direccion,
        matriculaPas: user.matriculaPas,
      },
    });
  } catch (error: any) {
    if (error.message === "INVALID_REFERRAL_CODE") {
      res.status(400).json({ error: "Código de referido inválido" });
      return;
    }
    if (error.message === "SELF_REFERRAL_CODE") {
      res.status(400).json({ error: "No podés usar tu propio código de referido" });
      return;
    }
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
