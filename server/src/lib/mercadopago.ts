import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "TEST-YOUR-ACCESS-TOKEN",
});

export async function createPreference(userId: string, planName: string, price: number) {
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
      notification_url: `${process.env.APP_URL}/api/subscriptions/webhook`,
      external_reference: userId,
    },
  });
  return result;
}
