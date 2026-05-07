const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = apiUrl ? `${apiUrl}/api` : '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(error.details || error.error || 'Error del servidor');
  }

  return res.json();
}

export const api = {
  landing: {
    submitContacto: (data: {
      nombre: string;
      email: string;
      telefono?: string;
      asunto: string;
      mensaje: string;
    }) =>
      request<{ message: string }>('/public/contacto', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    submitProductor: (data: FormData) =>
      request<{ message: string }>('/public/productores', {
        method: 'POST',
        body: data,
      }),
  },
};
