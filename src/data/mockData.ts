import { differenceInDays, parseISO } from 'date-fns';

export interface Policy {
  id: string;
  cliente: string;
  aseguradora: string;
  vencimiento: string;
  poliza: string;
  estado: string;
  tipo: 'Individual' | 'Empresa' | 'Vida' | 'Retiro';
  rubro?: string;
}

export const MOCK_POLICIES: Policy[] = [
  { id: '1', cliente: 'Juan Pérez', aseguradora: 'Sancor Seguros', vencimiento: '2026-03-01', poliza: '4452', estado: 'Vencida', tipo: 'Individual' },
  { id: '2', cliente: 'María García', aseguradora: 'Federación Patronal', vencimiento: '2026-03-05', poliza: '9921', estado: 'Vence pronto', tipo: 'Individual' },
  { id: '3', cliente: 'Carlos López', aseguradora: 'La Segunda', vencimiento: '2026-04-15', poliza: '1122', estado: 'Activa', tipo: 'Individual' },
  { id: '4', cliente: 'Ana Martínez', aseguradora: 'Zurich', vencimiento: '2026-03-04', poliza: '8877', estado: 'Vence pronto', tipo: 'Individual' },
  { id: '5', cliente: 'Pedro Sánchez', aseguradora: 'Mercantil Andina', vencimiento: '2026-02-28', poliza: '3344', estado: 'Vencida', tipo: 'Individual' },
  { id: '6', cliente: 'Tech Solutions S.A.', aseguradora: 'Prevención ART', vencimiento: '2026-03-03', poliza: 'ART-101', estado: 'Vence pronto', tipo: 'Empresa', rubro: 'Tecnología' },
  { id: '7', cliente: 'Logística Express', aseguradora: 'Experta ART', vencimiento: '2026-03-07', poliza: 'ART-202', estado: 'Activa', tipo: 'Empresa', rubro: 'Transporte' },
  { id: '8', cliente: 'Consorcio Edificio Sol', aseguradora: 'Sancor Seguros', vencimiento: '2026-03-02', poliza: 'CON-505', estado: 'Vence pronto', tipo: 'Empresa', rubro: 'Inmobiliario' },
  { id: '9', cliente: 'Roberto Gómez', aseguradora: 'Zurich', vencimiento: '2026-03-06', poliza: 'VID-999', estado: 'Activa', tipo: 'Vida' },
  { id: '10', cliente: 'Elena Ruiz', aseguradora: 'Sancor Seguros', vencimiento: '2026-03-04', poliza: 'RET-777', estado: 'Vence pronto', tipo: 'Retiro' },
];

export const getExpiringPoliciesCount = (policies: Policy[]) => {
  const today = new Date();
  return policies.filter(p => {
    const daysLeft = differenceInDays(parseISO(p.vencimiento), today);
    return daysLeft >= 0 && daysLeft <= 5;
  }).length;
};
