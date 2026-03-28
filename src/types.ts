import { Timestamp } from "firebase/firestore";

export type PlanStatus = 'trial' | 'activo' | 'vencido';

export interface UserProfile {
  userId: string;
  email: string;
  nombre: string;
  fechaRegistro: Timestamp;
  plan: PlanStatus;
  trialInicio: Timestamp;
  trialFin: Timestamp;
  estado: 'activo' | 'inactivo';
  referidosMes: number;
  referidosTotales: number;
  referralCode: string;
}

export interface Cliente {
  id?: string;
  userId: string;
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  direccion?: string;
  createdAt: Timestamp;
}

export type PolizaStatus = 'Activa' | 'Vence pronto' | 'Vencida';

export interface Poliza {
  id?: string;
  userId: string;
  clienteNombre: string;
  clienteDni: string;
  clienteTelefono: string;
  aseguradora: string;
  rubro: string;
  numeroPoliza: string;
  fechaInicio: Timestamp;
  fechaVencimiento: Timestamp;
  prima: number;
  porcentajeComision: number;
  comisionCalculada: number;
  estado: PolizaStatus;
  createdAt: Timestamp;
}

export interface Aseguradora {
  id?: string;
  nombre: string;
  userId: string; // To keep it scoped or global
}

export interface Rubro {
  id?: string;
  nombre: string;
  userId: string;
}
