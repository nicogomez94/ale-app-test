import {
  MercadoPagoConfig,
  Payment,
  PreApproval,
  PreApprovalPlan,
} from "mercadopago";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getClient(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado en el backend");
  }

  return new MercadoPagoConfig({ accessToken });
}

function getAppUrl(): string {
  return trimTrailingSlash(process.env.APP_URL || "http://localhost:5173");
}

function getWebhookUrl(): string | null {
  const explicitWebhookUrl = process.env.MP_WEBHOOK_URL?.trim();
  if (explicitWebhookUrl) {
    return explicitWebhookUrl;
  }

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderExternalUrl) {
    return `${trimTrailingSlash(renderExternalUrl)}/api/subscriptions/webhook`;
  }

  return null;
}

function getWebhookNotificationUrl(): string | undefined {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return undefined;

  if (webhookUrl.includes("source_news=")) {
    return webhookUrl;
  }

  const separator = webhookUrl.includes("?") ? "&" : "?";
  return `${webhookUrl}${separator}source_news=webhooks`;
}

export function getSubscriptionReturnUrl(): string {
  return `${getAppUrl()}/app/pagos?subscription=processing`;
}

export async function createPreapprovalPlan(body: {
  reason: string;
  status?: string;
  frequency: number;
  frequencyType: "months";
  transactionAmount: number;
  currencyId: "ARS";
}) {
  const plan = new PreApprovalPlan(getClient());
  const requestBody: any = {
    reason: body.reason,
    status: body.status || "active",
    back_url: getSubscriptionReturnUrl(),
    auto_recurring: {
      frequency: body.frequency,
      frequency_type: body.frequencyType,
      transaction_amount: body.transactionAmount,
      currency_id: body.currencyId,
    },
  };

  const notificationUrl = getWebhookNotificationUrl();
  if (notificationUrl) {
    requestBody.notification_url = notificationUrl;
  }

  return plan.create({
    body: requestBody,
  });
}

export async function searchPreapprovalPlans(query: string) {
  const plan = new PreApprovalPlan(getClient());
  return plan.search({
    options: {
      q: query,
      status: "active",
    },
  });
}

export async function createPreapprovalSubscription(body: {
  preapprovalPlanId: string;
  payerEmail: string;
  externalReference: string;
  reason: string;
}) {
  const preapproval = new PreApproval(getClient());
  const requestBody: any = {
    preapproval_plan_id: body.preapprovalPlanId,
    payer_email: body.payerEmail,
    external_reference: body.externalReference,
    reason: body.reason,
    back_url: getSubscriptionReturnUrl(),
    status: "pending",
  };

  const notificationUrl = getWebhookNotificationUrl();
  if (notificationUrl) {
    requestBody.notification_url = notificationUrl;
  }

  return preapproval.create({
    body: requestBody,
  });
}

export async function getPreapprovalById(preapprovalId: string) {
  const preapproval = new PreApproval(getClient());
  return preapproval.get({ id: preapprovalId });
}

export async function searchPreapprovals(params: {
  payerEmail?: string;
  preapprovalPlanId?: string;
  status?: string;
}) {
  const preapproval = new PreApproval(getClient());
  const options: Record<string, string> = {};
  if (params.payerEmail) options.payer_email = params.payerEmail;
  if (params.preapprovalPlanId) options.preapproval_plan_id = params.preapprovalPlanId;
  if (params.status) options.status = params.status;

  return preapproval.search({
    options,
  });
}

export async function cancelPreapproval(preapprovalId: string) {
  const preapproval = new PreApproval(getClient());
  return preapproval.update({
    id: preapprovalId,
    body: {
      status: "canceled",
    },
  });
}

export async function getPaymentById(paymentId: string | number) {
  const payment = new Payment(getClient());
  return payment.get({ id: paymentId });
}

export async function getAuthorizedPaymentById(authorizedPaymentId: string | number) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado en el backend");
  }

  const response = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`No se pudo obtener authorized_payment ${authorizedPaymentId}: ${response.status} ${details}`);
  }

  return response.json();
}
