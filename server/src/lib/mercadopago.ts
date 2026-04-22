import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    return true;
  } catch {
    return false;
  }
}

function getClient(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado en el backend");
  }
  return new MercadoPagoConfig({ accessToken });
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export async function createPreference(
  userId: string,
  planName: string,
  price: number,
  planKey?: string,
  billingCycle?: "monthly" | "annual"
) {

  const appUrl = trimTrailingSlash(process.env.APP_URL || "http://localhost:5173");
  const publicApiUrl = trimTrailingSlash(process.env.RENDER_EXTERNAL_URL || "");
  const webhookUrl = process.env.MP_WEBHOOK_URL || (isPublicHttpUrl(publicApiUrl)
    ? `${publicApiUrl}/api/subscriptions/webhook`
    : undefined);
  const client = getClient();
  const preference = new Preference(client);

  const body = {
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
      success: `${appUrl}/app/pagos?payment=success`,
      failure: `${appUrl}/app/pagos?payment=failure`,
      pending: `${appUrl}/app/pagos?payment=pending`,
    },
    ...(isPublicHttpUrl(appUrl) ? { auto_return: "approved" } : {}),
    external_reference: userId,
    metadata: {
      planName,
      planKey,
      billingCycle,
      price,
    },
    ...(webhookUrl ? { notification_url: webhookUrl } : {}),
  };

  const result = await preference.create({
    body,
  });

  return result;
}

export async function getPaymentById(paymentId: string | number) {
  const payment = new Payment(getClient());
  return payment.get({ id: paymentId });
}
