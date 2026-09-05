import { CurrencyType, PolicyVigencia } from '@prisma/client';

export function lifePolicyDetails(body: Record<string, unknown>) {
  const text = (key: string) => body[key] === undefined ? undefined : String(body[key] ?? '').trim() || null;
  const number = (key: string, integer = false) => {
    if (body[key] === undefined) return undefined;
    if (body[key] === null || body[key] === '') return null;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) throw new Error(`Valor inválido: ${key}`);
    return value;
  };
  const date = (key: string) => {
    if (!body[key]) return body[key] === undefined ? undefined : null;
    const value = new Date(String(body[key]));
    if (Number.isNaN(value.getTime())) throw new Error(`Fecha inválida: ${key}`);
    return value;
  };
  if (body.moneda && !Object.values(CurrencyType).includes(body.moneda as CurrencyType)) throw new Error('Moneda inválida');
  if (body.vigencia && !Object.values(PolicyVigencia).includes(body.vigencia as PolicyVigencia)) throw new Error('Vigencia inválida');
  if (body.medioPago && !['Cupon', 'Tarjeta de credito', 'Debito por CBU'].includes(String(body.medioPago))) throw new Error('Medio de pago inválido');
  return {
    tipoSeguro: text('tipoSeguro'), edad: number('edad', true), edadRetiro: number('edadRetiro', true),
    incremento: number('incremento'), frecuenciaIncremento: text('frecuenciaIncremento'),
    numeroPoliza: text('numeroPoliza'), medioPago: text('medioPago'),
    fechaInicio: date('fechaInicio'), fechaVencimiento: date('fechaVencimiento'),
    vigencia: body.vigencia as PolicyVigencia | undefined, moneda: body.moneda as CurrencyType | undefined,
    altura: text('altura'),
  };
}
