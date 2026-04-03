import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  InputAdornment, Autocomplete, Divider, Alert, Snackbar, MenuItem
} from '@mui/material';
import { User, Calendar, Shield, Phone, Hash, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DEBUG, debugData } from '../data/debugData';

const schema = z.object({
  clienteNombre: z.string().min(3, 'Nombre requerido (mín. 3 caracteres)'),
  clienteDni: z.string().min(7, 'DNI inválido (mín. 7 dígitos)'),
  clienteTelefono: z.string().min(8, 'Teléfono requerido (mín. 8 dígitos)'),
  aseguradora: z.string().min(1, 'Aseguradora requerida'),
  rubro: z.string().min(1, 'Rubro requerido'),
  numeroPoliza: z.string().min(1, 'Número de póliza requerido'),
  fechaInicio: z.string(),
  fechaVencimiento: z.string(),
  medioPago: z.string().min(1, 'Medio de pago requerido'),
  moneda: z.enum(['ARS', 'USD']),
  prima: z.number({ error: 'Prima requerida' }).min(1, 'Prima debe ser mayor a 0'),
  porcentajeComision: z.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;
type CurrencyCode = 'ARS' | 'USD';

const currencyPrefixMap: Record<CurrencyCode, string> = {
  ARS: '$',
  USD: 'USD',
};

const formatAmount = (value: number): string =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const parseAmount = (rawValue: string): number | undefined => {
  const cleaned = rawValue.replace(/[^\d.,]/g, '');
  if (!cleaned) return undefined;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let normalized: string;
  if (hasComma && hasDot) {
    const decimalSeparator = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = cleaned.split(thousandSeparator).join('').replace(decimalSeparator, '.');
  } else if (hasComma || hasDot) {
    const separator = hasComma ? ',' : '.';
    const parts = cleaned.split(separator);
    const looksLikeDecimal = parts.length === 2 && parts[1].length > 0 && parts[1].length !== 3;
    normalized = looksLikeDecimal ? `${parts[0]}.${parts[1]}` : parts.join('');
  } else {
    normalized = cleaned;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const PolicyForm: React.FC = () => {
  const navigate = useNavigate();
  const [snackOpen, setSnackOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: DEBUG ? { ...debugData.policy, moneda: 'ARS' } : {
      moneda: 'ARS',
      porcentajeComision: 15,
      medioPago: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const prima = watch('prima');
  const moneda = watch('moneda');
  const porcentaje = watch('porcentajeComision');
  const primaValue = typeof prima === 'number' && Number.isFinite(prima) ? prima : 0;
  const porcentajeValue = typeof porcentaje === 'number' && Number.isFinite(porcentaje) ? porcentaje : 0;
  const comisionCalculada = primaValue * (porcentajeValue / 100);
  const prefijoMoneda = currencyPrefixMap[moneda ?? 'ARS'];

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    try {
      await api.policies.create({
        ...data,
        comisionCalculada: parseFloat(comisionCalculada.toFixed(2)),
        tipo: 'INDIVIDUAL',
      });
      setSnackOpen(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const aseguradoras = ['Sancor Seguros', 'Federación Patronal', 'La Segunda', 'Mercantil Andina', 'Zurich', 'Allianz', 'Prevención ART', 'Experta ART', 'Galicia Seguros'];
  const rubros = ['Automotor', 'Moto', 'Celular / Electrónica', 'Hogar', 'Vida', 'Retiro', 'ART', 'Integral de Comercio', 'TRO', 'Consorcio', 'Flotas'];
  const mediosPago = ['Transferencia', 'Tarjeta de crédito', 'Tarjeta de débito'];
  const monedas: CurrencyCode[] = ['ARS', 'USD'];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>Nueva Póliza</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <User size={20} /> Datos del Cliente
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller name="clienteNombre" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="Nombre Completo" error={!!errors.clienteNombre} helperText={errors.clienteNombre?.message} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller name="clienteDni" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="DNI" error={!!errors.clienteDni} helperText={errors.clienteDni?.message} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller name="clienteTelefono" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="Teléfono" InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={16} /></InputAdornment> }}
                        error={!!errors.clienteTelefono} helperText={errors.clienteTelefono?.message} />
                    )} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Shield size={20} /> Detalles de la Póliza
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller name="aseguradora" control={control} render={({ field }) => (
                      <Autocomplete freeSolo options={aseguradoras}
                        onChange={(_, v) => field.onChange(v)} onInputChange={(_, v) => field.onChange(v)}
                        renderInput={(params: any) => <TextField {...params} label="Aseguradora" error={!!errors.aseguradora} helperText={errors.aseguradora?.message} />}
                      />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller name="rubro" control={control} render={({ field }) => (
                      <Autocomplete freeSolo options={rubros}
                        onChange={(_, v) => field.onChange(v)} onInputChange={(_, v) => field.onChange(v)}
                        renderInput={(params: any) => <TextField {...params} label="Rubro" error={!!errors.rubro} helperText={errors.rubro?.message} />}
                      />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller name="numeroPoliza" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="Número de Póliza" InputProps={{ startAdornment: <InputAdornment position="start"><Hash size={16} /></InputAdornment> }}
                        error={!!errors.numeroPoliza} helperText={errors.numeroPoliza?.message} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller name="fechaInicio" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth type="date" label="Fecha Inicio" InputLabelProps={{ shrink: true }} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller name="fechaVencimiento" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth type="date" label="Fecha Vencimiento" InputLabelProps={{ shrink: true }} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller name="medioPago" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth select label="Medio de Pago" error={!!errors.medioPago} helperText={errors.medioPago?.message}>
                        {mediosPago.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Resumen Económico</Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                <Box sx={{ mb: 3 }}>
                  <Controller name="moneda" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth select label="Moneda" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }, '& .MuiSvgIcon-root': { color: 'white' } }}>
                      {monedas.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  )} />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Controller name="prima" control={control} render={({ field }) => (
                    <TextField
                      name={field.name}
                      inputRef={field.ref}
                      onBlur={field.onBlur}
                      value={typeof field.value === 'number' && field.value > 0 ? formatAmount(field.value) : ''}
                      fullWidth
                      label={moneda === 'USD' ? 'Prima (USD)' : 'Prima (ARS)'}
                      onChange={(e) => field.onChange(parseAmount(e.target.value))}
                      placeholder="10.000"
                      inputMode="decimal"
                      InputProps={{ startAdornment: <InputAdornment position="start" sx={{ color: 'white' }}>{prefijoMoneda}</InputAdornment> }}
                      error={!!errors.prima}
                      helperText={errors.prima?.message}
                      FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.85)' } }}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
                    />
                  )} />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Controller name="porcentajeComision" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth label="Porcentaje Comisión (%)" type="number"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
                    />
                  )} />
                </Box>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Comisión Estimada</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{prefijoMoneda} {formatAmount(comisionCalculada)}</Typography>
                </Box>
              </CardContent>
            </Card>

            <Button type="submit" variant="contained" color="secondary" fullWidth size="large" disabled={saving}
              startIcon={<Save size={20} />} sx={{ py: 2, borderRadius: 3, fontWeight: 700 }}>
              {saving ? 'Guardando...' : 'Guardar Póliza'}
            </Button>
          </Grid>
        </Grid>
      </form>

      <Snackbar open={snackOpen} autoHideDuration={6000} onClose={() => setSnackOpen(false)}>
        <Alert onClose={() => setSnackOpen(false)} severity="success" sx={{ width: '100%' }}>
          Póliza guardada exitosamente.
        </Alert>
      </Snackbar>
    </Box>
  );
};
