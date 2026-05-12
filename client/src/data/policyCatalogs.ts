export type GeneralPolicyType = 'INDIVIDUAL' | 'EMPRESA';
export type PolicyVigencia = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type PaymentMethod = 'Cupon' | 'Tarjeta de credito' | 'Debito por CBU';

export const PROVINCIAS_ARGENTINA = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Cordoba',
  'Corrientes',
  'Entre Rios',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquen',
  'Rio Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucuman',
];

export const GENERAL_POLICY_CATEGORIES = [
  { category: 'Automotores y movilidad', items: ['Automoviles', 'Motos', 'Camiones', 'Transporte de carga', 'Flotas vehiculares', 'Maquinaria vial', 'Vehiculos agricolas'] },
  { category: 'Seguros patrimoniales', items: ['Hogar', 'Integral de hogar', 'Incendio', 'Robo', 'Cristales', 'Electrodomesticos', 'Equipos electronicos'] },
  { category: 'Seguros empresariales', items: ['Integral de comercio', 'Todo Riesgo Operativo (TRO)', 'Consorcio', 'Oficinas', 'Industrias', 'PyMES', 'Riesgos varios'] },
  { category: 'Seguros tecnicos', items: ['Todo Riesgo Construccion (TRC)', 'Todo Riesgo Montaje (TRM)', 'Equipos electronicos', 'Rotura de maquinaria', 'Equipos contratistas'] },
  { category: 'Responsabilidad civil', items: ['Responsabilidad Civil General', 'Responsabilidad Civil Profesional', 'Responsabilidad Civil Medica', 'Responsabilidad Civil Comprensiva', 'Responsabilidad Civil Patronal', 'Responsabilidad Civil Producto'] },
  { category: 'Riesgos del trabajo', items: ['ART (Aseguradora de Riesgos del Trabajo)', 'Accidentes personales', 'Seguro de vida obligatorio (empleados)'] },
  { category: 'Seguros de transporte', items: ['Transporte de mercaderias', 'Transporte terrestre', 'Transporte maritimo', 'Transporte aereo'] },
  { category: 'Seguros aeronauticos', items: ['Aeronaves', 'Responsabilidad civil aeronautica'] },
  { category: 'Seguros nauticos', items: ['Embarcaciones deportivas', 'Responsabilidad civil nautica'] },
  { category: 'Seguros agropecuarios', items: ['Seguro agricola', 'Seguro ganadero', 'Seguro multirriesgo agropecuario', 'Seguro de granizo'] },
  { category: 'Seguros financieros', items: ['Caucion', 'Credito', 'Garantias contractuales', 'Seguro de credito'] },
  { category: 'Seguros especiales', items: ['Ciberseguridad (Cyber Risk)', 'Seguro para drones', 'Seguro de equipos tecnologicos', 'Seguro de identidad digital'] },
  { category: 'Otros seguros', items: ['Sepelio', 'Asistencia al viajero', 'Seguro de mascotas', 'Seguro de bicicletas', 'Seguro escolar'] },
];

export const GENERAL_RUBRO_OPTIONS = GENERAL_POLICY_CATEGORIES.flatMap((category) =>
  category.items.map((label) => ({ label, category: category.category }))
);

export const ASEGURADORAS = [
  'Federacion Patronal Seguros',
  'Sancor Seguros',
  'La Segunda Seguros',
  'Mercantil Andina',
  'Zurich Argentina',
  'Allianz Argentina',
  'Mapfre Argentina',
  'Provincia Seguros',
  'Galicia Seguros',
  'BBVA Seguros',
  'SMG Seguros',
  'La Caja Seguros',
  'Seguros Rivadavia',
  'Triunfo Seguros',
  'ATM Seguros',
  'San Cristobal Seguros',
  'Berkley Argentina',
  'Chubb Argentina',
  'HDI Seguros',
  'Integrity Seguros',
  'Orbis Seguros',
  'Nacion Seguros',
  'Rio Uruguay Seguros',
  'Parana Seguros',
  'Victoria Seguros',
  'Prevencion ART',
  'Provincia ART',
  'Experta ART',
  'La Segunda ART',
  'Galeno ART',
  'Swiss Medical ART',
  'Asociart ART',
];

export const VIGENCIA_OPTIONS: Array<{ value: PolicyVigencia; label: string }> = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
];

export const PAYMENT_OPTIONS: PaymentMethod[] = ['Cupon', 'Tarjeta de credito', 'Debito por CBU'];

const ENTERPRISE_KEYWORDS = [
  'art',
  'flotas',
  'camiones',
  'transporte de carga',
  'integral de comercio',
  'todo riesgo operativo',
  'tro',
  'consorcio',
  'oficinas',
  'industrias',
  'pymes',
  'riesgos varios',
  'construccion',
  'montaje',
  'rotura de maquinaria',
  'equipos contratistas',
  'caucion',
  'credito',
  'garantias contractuales',
  'seguro de credito',
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function classifyGeneralPolicyTypeFromRubro(rubro: string): GeneralPolicyType {
  const normalized = normalize(rubro);
  if (!normalized) return 'INDIVIDUAL';
  return ENTERPRISE_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? 'EMPRESA' : 'INDIVIDUAL';
}

export function getQuotaTotalFromVigencia(vigencia: PolicyVigencia): number {
  switch (vigencia) {
    case 'MENSUAL':
      return 1;
    case 'BIMESTRAL':
      return 2;
    case 'TRIMESTRAL':
      return 3;
    case 'SEMESTRAL':
      return 6;
    case 'ANUAL':
    default:
      return 12;
  }
}

export function getVigenciaLabel(vigencia: PolicyVigencia): string {
  return VIGENCIA_OPTIONS.find((option) => option.value === vigencia)?.label || 'Anual';
}

export function calculateVencimiento(fechaInicio: string, vigencia: PolicyVigencia): string {
  if (!fechaInicio) return '';
  const date = new Date(`${fechaInicio}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';

  switch (vigencia) {
    case 'MENSUAL':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'BIMESTRAL':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'TRIMESTRAL':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'SEMESTRAL':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'ANUAL':
    default:
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}
