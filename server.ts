import express from "express";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference } from "mercadopago";
import dotenv from "dotenv";

dotenv.config();

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-YOUR-ACCESS-TOKEN' 
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES (Simulating Cloud Functions) ---

  // Mercado Pago: Create Preference
  app.post("/api/payments/create-preference", async (req, res) => {
    try {
      const { userId, planName, price } = req.body;
      
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: "plan-mensual",
              title: `PAS Alert - Plan ${planName}`,
              quantity: 1,
              unit_price: price,
              currency_id: "ARS",
            },
          ],
          back_urls: {
            success: `${process.env.APP_URL}/dashboard?payment=success`,
            failure: `${process.env.APP_URL}/dashboard?payment=failure`,
            pending: `${process.env.APP_URL}/dashboard?payment=pending`,
          },
          auto_return: "approved",
          notification_url: `${process.env.APP_URL}/api/payments/webhook`,
          external_reference: userId,
        },
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error("Error creating MP preference:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Mercado Pago: Webhook
  app.post("/api/payments/webhook", async (req, res) => {
    const { query } = req;
    const topic = query.topic || query.type;

    console.log("MP Webhook received:", topic, req.body);

    // In a real implementation, you would:
    // 1. Verify the payment with MP API
    // 2. Update the user document in Firestore (plan = 'activo', dates, etc.)
    // Since we are in a sandbox, we'll just log it.
    
    res.status(200).send("OK");
  });

  // Simulated Cloud Scheduler: Daily Automation
  // In a real Firebase setup, this would be a separate Cloud Function
  app.post("/api/admin/daily-sync", async (req, res) => {
    // Logic to:
    // 1. Fetch all policies
    // 2. Update status (Active, Expiring, Expired)
    // 3. Update user metrics
    console.log("Daily sync triggered");
    res.json({ message: "Daily sync completed" });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PAS Alert Server running on http://localhost:${PORT}`);
  });
}

startServer();
