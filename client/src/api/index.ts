const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const API_BASE = apiUrl ? `${apiUrl}/api` : "/api";

export type PolicyVigencia = "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
export type PolicyType = "INDIVIDUAL" | "EMPRESA";
export type InteractionChannel = "WHATSAPP" | "EMAIL";
export type CouponDeliveryStatus = "ACCEPTED" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface CouponDelivery {
  id: string;
  status: CouponDeliveryStatus;
  recipient: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyCoupon {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  lastDelivery: CouponDelivery | null;
}

export interface PolicyOriginalDocument {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPolicy {
  id: string;
  clienteId: string | null;
  companyId: string | null;
  cliente: string;
  clienteNombre: string;
  clienteDni: string;
  clienteTelefono: string;
  clienteEmail: string;
  aseguradora: string;
  rubro: string;
  poliza: string;
  inicio: string;
  vencimiento: string;
  estado: "ACTIVA" | "VENCE_PRONTO" | "VENCIDA";
  estadoLabel: string;
  tipo: PolicyType;
  medioPago: string;
  diasRestantes: number;
  telefono: string;
  email: string;
  direccion: string;
  altura: string;
  cp: string;
  provincia: string;
  localidad: string;
  vigencia: PolicyVigencia;
  vigenciaLabel: string;
  cuotaActual: number;
  cuotaTotal: number;
  cuota: string;
  groupId: string;
  pagada: boolean;
  fechaPago: string;
  prima: number;
  premioTotal?: number | null;
  cobertura?: string | null;
  endoso?: string | null;
  patente?: string | null;
  chasis?: string | null;
  motor?: string | null;
  direccionRiesgo?: string | null;
  porcentajeComision: number;
  moneda: string;
  comisionCalculada: number;
  coupon: PolicyCoupon | null;
  policyDocument: PolicyOriginalDocument | null;
  ultimaGestion: {
    tipo: InteractionChannel;
    fecha: string;
    whatsappCount: number;
    mailCount: number;
  } | null;
}

export interface PolicyPayload {
  clienteId?: string | null;
  companyId?: string | null;
  clienteNombre: string;
  clienteDni: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDireccion?: string;
  clienteAltura?: string;
  clienteCp?: string;
  clienteProvincia?: string;
  clienteLocalidad?: string;
  aseguradora: string;
  rubro: string;
  numeroPoliza: string;
  fechaInicio: string;
  fechaVencimiento: string;
  medioPago: string;
  vigencia: PolicyVigencia;
  cuotaActual: number;
  cuotaTotal: number;
  groupId: string;
  pagada?: boolean;
  fechaPago?: string;
  prima: number;
  premioTotal?: number | null;
  cobertura?: string | null;
  endoso?: string | null;
  patente?: string | null;
  chasis?: string | null;
  motor?: string | null;
  direccionRiesgo?: string | null;
  porcentajeComision: number;
  moneda?: string;
  tipo: PolicyType;
}

export interface PolicyPaymentResponse {
  policy: DashboardPolicy;
  renewalCreated: boolean;
  renewalPolicies: DashboardPolicy[];
  nextQuotaCreated?: boolean;
  nextQuotaPolicies?: DashboardPolicy[];
}

export type PolicyImportStatus = "PROCESSING" | "READY" | "INCOMPLETE" | "CONFIRMED" | "FAILED";

export interface PolicyImportData extends Partial<PolicyPayload> {
  premioTotal?: number | null;
  cobertura?: string | null;
  endoso?: string | null;
  patente?: string | null;
  chasis?: string | null;
  motor?: string | null;
  direccionRiesgo?: string | null;
  cuotas?: Array<{ numero?: number; vencimiento?: string; importe?: number }>;
}

export interface PolicyImportDocument {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: PolicyImportStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyImportCandidate {
  id: string;
  batchId: string;
  documentId: string;
  status: PolicyImportStatus;
  data: PolicyImportData;
  foundFields: string[];
  missingFields: string[];
  warnings: string[];
  policyId: string | null;
  policyGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyImportBatch {
  id: string;
  status: PolicyImportStatus;
  createdAt: string;
  updatedAt: string;
  documents: PolicyImportDocument[];
  candidates: PolicyImportCandidate[];
}

export interface PolicyListItem {
  id: string;
  clienteNombre: string;
  aseguradora: string;
  numeroPoliza: string;
  moneda: string;
  comisionCalculada: number;
  cuotaActual: number;
  cuotaTotal: number;
}

export interface CommissionInvoicePayload {
  insuranceCompanyId: string;
  periodo: string;
  numeroFactura: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  estado: string;
  monto: number;
  moneda: "ARS" | "USD";
  comprobanteUrl?: string;
  notes?: string;
  policyIds: string[];
}

export interface CommissionPaymentPayload {
  fechaPago: string;
  monto: number;
  medioPago?: string;
  comprobanteUrl?: string;
}

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

async function requestBlob(endpoint: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error del servidor" }));
    throw new Error(error.message || error.error || "No se pudo descargar el archivo");
  }
  return res.blob();
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (nombre: string, email: string, password: string, referralCode?: string) =>
      request<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ nombre, email, password, referralCode }),
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
    googleLogin: (idToken: string, nombre: string, email: string, photoURL?: string, referralCode?: string) =>
      request<{ token: string; user: any }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken, nombre, email, photoURL, referralCode }),
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
      return request<DashboardPolicy[]>(`/dashboard/policies${qs ? `?${qs}` : ""}`);
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
      return request<PolicyListItem[]>(`/policies${qs}`);
    },
    create: (data: PolicyPayload) =>
      request<DashboardPolicy & { generatedCount: number; generatedPolicies: DashboardPolicy[] }>("/policies", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: PolicyPayload) =>
      request<DashboardPolicy>(`/policies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/policies/${id}`, { method: "DELETE" }),
    updatePayment: (id: string, data: { pagada: boolean; fechaPago?: string }) =>
      request<PolicyPaymentResponse>(`/policies/${id}/payment`, { method: "PATCH", body: JSON.stringify(data) }),
    trackInteraction: (id: string, channel: InteractionChannel) =>
      request<DashboardPolicy>(`/policies/${id}/interactions`, { method: "POST", body: JSON.stringify({ channel }) }),
    coupon: {
      get: (id: string) => request<{ coupon: PolicyCoupon | null }>(`/policies/${id}/coupon`),
      upload: (id: string, file: File) => {
        const body = new FormData();
        body.append("file", file);
        return request<{ coupon: PolicyCoupon }>(`/policies/${id}/coupon`, { method: "POST", body });
      },
      download: (id: string) => requestBlob(`/policies/${id}/coupon/download`),
      delete: (id: string) => request<{ message: string }>(`/policies/${id}/coupon`, { method: "DELETE" }),
      sendWhatsApp: (id: string) =>
        request<{ delivery: CouponDelivery }>(`/policies/${id}/coupon/send-whatsapp`, { method: "POST" }),
    },
    updateStatuses: () =>
      request<any>("/policies/update-statuses", { method: "POST" }),
  },

  policyImports: {
    create: (files: File[]) => {
      const body = new FormData();
      files.forEach((file) => body.append("files", file));
      return request<{ batch: PolicyImportBatch }>("/policy-imports", { method: "POST", body });
    },
    get: (batchId: string) =>
      request<{ batch: PolicyImportBatch }>(`/policy-imports/${batchId}`),
    confirm: (candidateId: string, data: PolicyImportData) =>
      request<{ policy: DashboardPolicy; candidate: PolicyImportCandidate }>(`/policy-imports/candidates/${candidateId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ data }),
      }),
  },

  policyDocuments: {
    download: (policyGroupId: string) => requestBlob(`/policy-documents/${policyGroupId}/download`),
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
    invoices: {
      list: (params?: { search?: string; periodo?: string; estado?: string; insuranceCompanyId?: string }) => {
        const qs = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()}` : "";
        return request<Record<string, unknown>[]>(`/commissions/invoices${qs}`);
      },
      create: (data: CommissionInvoicePayload) =>
        request<Record<string, unknown>>("/commissions/invoices", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: CommissionInvoicePayload) =>
        request<Record<string, unknown>>(`/commissions/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<any>(`/commissions/invoices/${id}`, { method: "DELETE" }),
      addPayment: (invoiceId: string, data: CommissionPaymentPayload) =>
        request<Record<string, unknown>>(`/commissions/invoices/${invoiceId}/payments`, { method: "POST", body: JSON.stringify(data) }),
      deletePayment: (invoiceId: string, paymentId: string) =>
        request<Record<string, unknown>>(`/commissions/invoices/${invoiceId}/payments/${paymentId}`, { method: "DELETE" }),
      export: () => request<Blob>("/commissions/invoices/export"),
    },
  },

  // Directory
  directory: {
    insurers: {
      list: (search?: string) =>
        request<any[]>(`/directory/insurers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      create: (data: any) =>
        request<any>("/directory/insurers", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request<any>(`/directory/insurers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<any>(`/directory/insurers/${id}`, { method: "DELETE" }),
      revealPassword: (id: string) =>
        request<{ password: string }>(`/directory/insurers/${id}/portal-password`),
      export: () => request<Blob>("/directory/insurers/export"),
    },
    brokers: {
      list: (search?: string) =>
        request<any[]>(`/directory/brokers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      create: (data: any) =>
        request<any>("/directory/brokers", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request<any>(`/directory/brokers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<any>(`/directory/brokers/${id}`, { method: "DELETE" }),
      export: () => request<Blob>("/directory/brokers/export"),
    },
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
    plans: () => request<any[]>("/subscriptions/plans"),
    current: () => request<any>("/subscriptions/current"),
    createPreapproval: (planKey: string, billingCycle: "MONTHLY" | "ANNUAL") =>
      request<{ init_point: string; subscriptionId?: string; providerStatus?: string }>("/subscriptions/create-preapproval", {
        method: "POST",
        body: JSON.stringify({ planKey, billingCycle }),
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
    plans: () => request<any[]>("/admin/plans"),
    updatePlan: (plan: string, data: { name: string; monthlyPrice: number; isVisible: boolean; annualEnabled: boolean; features: string[] }) =>
      request<any>(`/admin/plans/${plan}`, { method: "PUT", body: JSON.stringify(data) }),
    stats: () => request<any>("/admin/stats"),
    weeklySummaries: () => request<any>("/admin/weekly-summaries"),
    users: (search?: string) =>
      request<any[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    updateUser: (id: string, data: { plan?: string; estado?: string; isTestUser?: boolean; trialDays?: number; trialMode?: "set" | "extend" }) =>
      request<any>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteUser: (id: string) =>
      request<any>(`/admin/users/${id}`, { method: "DELETE" }),
    runJobs: () =>
      request<any>("/admin/run-jobs", { method: "POST" }),
    testSeed: (userId: string, scenario: string) =>
      request<any>("/admin/test-seed", { method: "POST", body: JSON.stringify({ userId, scenario }) }),
  },

  // Siniestros
  siniestros: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<any[]>(`/siniestros${qs}`);
    },
    kpis: () => request<{ total: number; activos: number; montoReclamadoTotal: number; montoPagadoTotal: number }>("/siniestros/kpis"),
    create: (data: any) =>
      request<any>("/siniestros", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/siniestros/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/siniestros/${id}`, { method: "DELETE" }),
    addNota: (id: string, texto: string) =>
      request<any>(`/siniestros/${id}/notas`, { method: "POST", body: JSON.stringify({ texto }) }),
    export: () => request<Blob>("/siniestros/export"),
  },

  // Cotizaciones
  cotizaciones: {
    list: (params?: { tipo?: string; search?: string }) => {
      const qs = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()}` : "";
      return request<any[]>(`/cotizaciones${qs}`);
    },
    create: (data: any) =>
      request<any>("/cotizaciones", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/cotizaciones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    markViewed: (id: string) =>
      request<any>(`/cotizaciones/${id}/viewed`, { method: "PATCH" }),
    delete: (id: string) =>
      request<any>(`/cotizaciones/${id}`, { method: "DELETE" }),
    export: (params?: { tipo?: string }) => {
      const qs = params?.tipo ? `?tipo=${encodeURIComponent(params.tipo)}` : "";
      return request<Blob>(`/cotizaciones/export${qs}`);
    },
  },
};
