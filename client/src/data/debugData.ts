// Debug pre-fill data.
// Enabled by:
// 1) VITE_DEBUG_MODE=true at build time
// 2) URL query param ?debug=1 | true | on
// 3) localStorage.setItem('debug_mode', 'true')
const DEBUG_FROM_ENV = import.meta.env.VITE_DEBUG_MODE === 'true';

const DEBUG_FROM_RUNTIME = (() => {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const q = (params.get('debug') || '').toLowerCase();
  const fromQuery = q === '1' || q === 'true' || q === 'on';
  const fromStorage = window.localStorage.getItem('debug_mode') === 'true';

  if (fromQuery) {
    window.localStorage.setItem('debug_mode', 'true');
    return true;
  }

  return fromStorage;
})();

export const DEBUG = DEBUG_FROM_ENV || DEBUG_FROM_RUNTIME;

export const debugData = {
  login: {
    email: 'admin@pasalert.com',
    password: '123456',
  },
  client: {
    nombre: 'Carlos Rodríguez',
    dni: '28456712',
    telefono: '1156789012',
    email: 'carlos.rodriguez@email.com',
    direccion: 'Av. Corrientes 1234',
    cp: '1043',
  },
  company: {
    razonSocial: 'Transport Express S.A.',
    cuit: '30-71234567-0',
    ramo: 'Transporte y Logística',
    cantidadVehiculos: '12',
    cantidadEmpleados: '45',
    aseguradora: 'Federación Patronal',
    email: 'admin@transportexpress.com',
    telefono: '1145678901',
    direccion: 'Av. San Martín 2500',
    cp: '1650',
  },
  lifePolicy: {
    VIDA: {
      cliente: 'María González',
      cuit: '27-35678901-3',
      aseguradora: 'Sancor Seguros',
      sumaAsegurada: '5000000',
      prima: '15000',
      email: 'maria.gonzalez@email.com',
      telefono: '1162345678',
      cp: '1900',
    },
    RETIRO: {
      cliente: 'Roberto Silva',
      cuit: '20-28901234-1',
      aseguradora: 'Zurich',
      aporteMensual: '30000',
      fondoAcumulado: '850000',
      email: 'roberto.silva@email.com',
      telefono: '1174567890',
      cp: '5000',
    },
  },
  policy: {
    clienteNombre: 'Laura Martínez',
    clienteDni: '31456789',
    clienteTelefono: '1187654321',
    aseguradora: 'Sancor Seguros',
    rubro: 'Automotor',
    numeroPoliza: 'POL-2026-00099',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    medioPago: 'Transferencia',
    prima: 45000,
    porcentajeComision: 15,
  },
  profile: {
    nombre: 'Alejandro Díaz',
    email: 'alejandro.rh.diaz@gmail.com',
    telefono: '1123456789',
    direccion: 'Av. Libertador 5500, CABA',
  },
};
