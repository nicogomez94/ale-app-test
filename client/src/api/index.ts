const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const API_BASE = apiUrl ? `${apiUrl}/api` : "/api";

function getToken(): string | null {
  return localStorage.getItem("pas_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const isAuthEndpoint = endpoint.startsWith("/auth/");
    const errorBody = await res.json().catch(() => ({ error: "No autorizado" }));

    // Never hard-redirect on auth failures. Keep the user on the current view
    // so UI components can render the exact backend error message.
    if (!isAuthEndpoint) localStorage.removeItem("pas_token");

    throw new Error(errorBody.error || "No autorizado");
  }

  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({ error: "forbidden" }));
    if (errorBody.error === "subscription_expired") {
      window.dispatchEvent(new CustomEvent("subscription_expired"));
    }
    throw new Error(errorBody.message || "Suscripción vencida");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error del servidor" }));
    throw new Error(error.details || error.error || "Error del servidor");
  }

  // Handle blob responses (Excel export)
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("spreadsheetml")) {
    return res.blob() as unknown as T;
  }

  return res.json();
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (nombre: string, email: string, password: string) =>
      request<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ nombre, email, password }),
      }),
    me: () => request<any>("/auth/me"),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (email: string, code: string, newPassword: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
      }),
  },

  // Public landing forms
  landing: {
    submitContacto: (data: {
      nombre: string;
      email: string;
      telefono?: string;
      asunto: string;
      mensaje: string;
    }) =>
      request<{ message: string }>("/public/contacto", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    submitProductor: (data: FormData) =>
      request<{ message: string }>("/public/productores", {
        method: "POST",
        body: data,
      }),
  },

  // Dashboard
  dashboard: {
    stats: () => request<any>("/dashboard/stats"),
    policies: (filter?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      if (limit && Number.isInteger(limit) && limit > 0) {
        params.set("limit", String(limit));
      }
      const qs = params.toString();
      return request<any[]>(`/dashboard/policies${qs ? `?${qs}` : ""}`);
    },
    alerts: () => request<any[]>("/dashboard/alerts"),
  },

  // Clients
  clients: {
    list: (search?: string) =>
      request<any[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    create: (data: any) =>
      request<any>("/clients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/clients/${id}`, { method: "DELETE" }),
    export: () => request<Blob>("/clients/export"),
  },

  // Companies
  companies: {
    list: (tipo?: string, search?: string) => {
      const params = new URLSearchParams();
      if (tipo) params.set("tipo", tipo);
      if (search) params.set("search", search);
      return request<any[]>(`/companies?${params.toString()}`);
    },
    create: (data: any) =>
      request<any>("/companies", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/companies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/companies/${id}`, { method: "DELETE" }),
    export: (tipo?: string) =>
      request<Blob>(`/companies/export${tipo ? `?tipo=${tipo}` : ""}`),
  },

  // Policies
  policies: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<any[]>(`/policies${qs}`);
    },
    create: (data: any) =>
      request<any>("/policies", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/policies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/policies/${id}`, { method: "DELETE" }),
    updateStatuses: () =>
      request<any>("/policies/update-statuses", { method: "POST" }),
  },

  // Life & Finance
  lifePolicies: {
    list: (tipo?: string, search?: string) => {
      const params = new URLSearchParams();
      if (tipo) params.set("tipo", tipo);
      if (search) params.set("search", search);
      return request<any[]>(`/life-policies?${params.toString()}`);
    },
    create: (data: any) =>
      request<any>("/life-policies", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/life-policies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/life-policies/${id}`, { method: "DELETE" }),
    export: (tipo?: string) =>
      request<Blob>(`/life-policies/export${tipo ? `?tipo=${tipo}` : ""}`),
  },

  // Commissions
  commissions: {
    summary: () => request<any>("/commissions/summary"),
    monthly: () => request<any[]>("/commissions/monthly"),
    close: (mes: number, anio: number) =>
      request<any>("/commissions/close", {
        method: "POST",
        body: JSON.stringify({ mes, anio }),
      }),
    export: () => request<Blob>("/commissions/export"),
  },

  // Referrals
  referrals: {
    status: () => request<any>("/referrals/status"),
    trackShare: (method: string) =>
      request<any>("/referrals/track-share", {
        method: "POST",
        body: JSON.stringify({ method }),
      }),
  },

  // Subscriptions
  subscriptions: {
    current: () => request<any>("/subscriptions/current"),
    createPreapproval: (planKey: string) =>
      request<{ init_point: string; subscriptionId?: string; providerStatus?: string }>("/subscriptions/create-preapproval", {
        method: "POST",
        body: JSON.stringify({ planKey }),
      }),
    cancel: () =>
      request<{ message: string; providerStatus: string; planVencimiento?: string }>("/subscriptions/cancel", {
        method: "POST",
      }),
    payments: () => request<any[]>("/subscriptions/payments"),
  },

  // Profile
  profile: {
    get: () => request<any>("/profile"),
    update: (data: any) =>
      request<any>("/profile", { method: "PUT", body: JSON.stringify(data) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<any>("/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  // Admin
  admin: {
    stats: () => request<any>("/admin/stats"),
    users: (search?: string) =>
      request<any[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    updateUser: (id: string, data: { plan?: string; estado?: string }) =>
      request<any>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteUser: (id: string) =>
      request<any>(`/admin/users/${id}`, { method: "DELETE" }),
    runJobs: () =>
      request<any>("/admin/run-jobs", { method: "POST" }),
    testSeed: (userId: string, scenario: string) =>
      request<any>("/admin/test-seed", { method: "POST", body: JSON.stringify({ userId, scenario }) }),
  },
};
