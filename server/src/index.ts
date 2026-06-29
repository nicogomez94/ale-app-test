import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { authRouter } from "./routes/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { companiesRouter } from "./routes/companies.js";
import { policiesRouter } from "./routes/policies.js";
import { lifeFinanceRouter } from "./routes/lifeFinance.js";
import { commissionsRouter } from "./routes/commissions.js";
import { referralsRouter } from "./routes/referrals.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { profileRouter } from "./routes/profile.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { adminRouter } from "./routes/admin.js";
import { siniestrosRouter } from "./routes/siniestros.js";
import { cotizacionesRouter } from "./routes/cotizaciones.js";
import { directoryRouter } from "./routes/directory.js";
import { authMiddleware } from "./middleware/auth.js";
import { subscriptionGuard } from "./middleware/subscriptionGuard.js";
import { startSubscriptionReminders } from "./lib/subscriptionReminders.js";
import { whatsappWebhookRouter } from "./routes/whatsappWebhook.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

const allowedOrigins = [
  process.env.APP_URL,
  process.env.SYSTEM_APP_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS || "").split(","),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (
      allowedOrigins.includes(origin) ||
      origin === "http://localhost:5173" ||
      origin === "http://localhost:4173"
    ) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use("/api/whatsapp/webhook", express.raw({ type: "application/json", limit: "1mb" }), whatsappWebhookRouter);
app.use(express.json({ limit: "5mb" }));

// Unguarded routes (accessible even with expired subscription)
app.use("/api/auth", authRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/profile", profileRouter);

// Guarded routes (blocked when subscription expired)
app.use("/api/clients", authMiddleware, subscriptionGuard, clientsRouter);
app.use("/api/companies", authMiddleware, subscriptionGuard, companiesRouter);
app.use("/api/policies", authMiddleware, subscriptionGuard, policiesRouter);
app.use("/api/life-policies", authMiddleware, subscriptionGuard, lifeFinanceRouter);
app.use("/api/commissions", authMiddleware, subscriptionGuard, commissionsRouter);
app.use("/api/directory", authMiddleware, subscriptionGuard, directoryRouter);
app.use("/api/referrals", authMiddleware, subscriptionGuard, referralsRouter);
app.use("/api/dashboard", authMiddleware, subscriptionGuard, dashboardRouter);
app.use("/api/siniestros", authMiddleware, subscriptionGuard, siniestrosRouter);
app.use("/api/cotizaciones", cotizacionesRouter); // has mixed public/protected routes internally
app.use("/api/admin", adminRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PAS Alert Server running on http://localhost:${PORT}`);
});

startSubscriptionReminders();
