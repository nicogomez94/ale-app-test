const MAIL_SERVICE_URL = "https://contact-form-service-e8aa.onrender.com/api/contact";

interface EmailPayload {
  name: string;
  email: string;
  to: string;
  message: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const site = process.env.MAIL_SITE || "PAS Alert";

  const body = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    to: payload.to.trim(),
    message: payload.message.trim(),
    site,
    company: "",
  };

  const res = await fetch(MAIL_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email service error ${res.status}: ${text}`);
  }

  const json: unknown = await res.json().catch(() => ({}));
  if (
    typeof json === "object" &&
    json !== null &&
    (json as Record<string, unknown>).success === false
  ) {
    throw new Error("Email service returned success: false");
  }
}
