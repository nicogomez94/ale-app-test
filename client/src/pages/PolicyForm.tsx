import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { Building2, Hash, Mail, MapPin, Phone, Save, Shield, User } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { api, PolicyPayload } from '../api';
import { DEBUG, debugData } from '../data/debugData';
import {
  ASEGURADORAS,
  calculateVencimiento,
  classifyGeneralPolicyTypeFromRubro,
  GENERAL_RUBRO_OPTIONS,
  getQuotaTotalFromVigencia,
  PAYMENT_OPTIONS,
  PolicyVigencia,
  PROVINCIAS_ARGENTINA,
  VIGENCIA_OPTIONS,
} from '../data/policyCatalogs';

const schema = z.object({
  clienteNombre: z.string().min(3, 'Nombre requerido (min. 3 caracteres)'),
  clienteDni: z.string().min(7, 'DNI/CUIT invalido'),
  clienteTelefono: z.string().min(8, 'Telefono requerido'),
  clienteEmail: z.string().email('Email invalido'),
  clienteDireccion: z.string().optional(),
  clienteAltura: z.string().optional(),
  clienteCp: z.string().optional(),
  clienteProvincia: z.string().optional(),
  clienteLocalidad: z.string().optional(),
  aseguradora: z.string().min(1, 'Aseguradora requerida'),
  rubro: z.string().min(1, 'Rubro requerido'),
  numeroPoliza: z.string().min(1, 'Numero de poliza requerido'),
  fechaInicio: z.string().min(1, 'Fecha de inicio requerida'),
  fechaVencimiento: z.string().min(1, 'Fecha de vencimiento requerida'),
  medioPago: z.enum(['Cupon', 'Tarjeta de credito', 'Debito por CBU']),
  vigencia: z.enum(['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']),
  prima: z.number({ error: 'Prima requerida' }).min(1, 'Prima debe ser mayor a 0'),
  porcentajeComision: z.number({ error: 'Comision requerida' }).min(0).max(100),
  moneda: z.enum(['ARS', 'USD', 'EUR', 'BRL']).default('ARS'),
});

type FormData = z.infer<typeof schema>;

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

function createGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `group-${Date.now()}`;
}

export const PolicyForm: React.FC = () => {
  const navigate = useNavigate();
  const [snackOpen, setSnackOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualVencimiento, setManualVencimiento] = useState(false);

  const defaultFechaInicio = new Date().toISOString().split('T')[0];

  const defaultValues = useMemo<FormData>(() => {
    if (DEBUG) {
      return {
        ...debugData.policy,
      } as FormData;
    }

    return {
      clienteNombre: '',
      clienteDni: '',
      clienteTelefono: '',
      clienteEmail: '',
      clienteDireccion: '',
      clienteAltura: '',
      clienteCp: '',
      clienteProvincia: '',
      clienteLocalidad: '',
      aseguradora: '',
      rubro: '',
      numeroPoliza: '',
      fechaInicio: defaultFechaInicio,
      fechaVencimiento: calculateVencimiento(defaultFechaInicio, 'ANUAL'),
      medioPago: 'Cupon',
      vigencia: 'ANUAL',
      prima: 0 as unknown as number,
      porcentajeComision: 15,
      moneda: 'ARS' as const,
    };
  }, [defaultFechaInicio]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const fechaInicio = watch('fechaInicio');
  const fechaVigencia = watch('vigencia');
  const prima = watch('prima');
  const porcentaje = watch('porcentajeComision');
  const rubro = watch('rubro');

  useEffect(() => {
    if (!manualVencimiento && fechaInicio && fechaVigencia) {
      setValue('fechaVencimiento', calculateVencimiento(fechaInicio, fechaVigencia));
    }
  }, [fechaInicio, fechaVigencia, manualVencimiento, setValue]);

  const primaValue = typeof prima === 'number' && Number.isFinite(prima) ? prima : 0;
  const porcentajeValue = typeof porcentaje === 'number' && Number.isFinite(porcentaje) ? porcentaje : 0;
  const comisionCalculada = primaValue * (porcentajeValue / 100);
  const policyType = classifyGeneralPolicyTypeFromRubro(rubro || '');

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');

    try {
      const groupId = createGroupId();
      const cuotaTotal = getQuotaTotalFromVigencia(data.vigencia as PolicyVigencia);
      const payload: PolicyPayload = {
        ...data,
        groupId,
        cuotaActual: 1,
        cuotaTotal,
        pagada: false,
        tipo: policyType,
        moneda: data.moneda,
      };

      await api.policies.create(payload);
      setSnackOpen(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la poliza');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
        Nueva Poliza
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <User size={20} /> Datos del Asegurado
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="clienteNombre"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label={policyType === 'EMPRESA' ? 'Empresa / Razon Social' : 'Nombre Completo'} error={!!errors.clienteNombre} helperText={errors.clienteNombre?.message} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="clienteDni"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label={policyType === 'EMPRESA' ? 'CUIT' : 'DNI'} error={!!errors.clienteDni} helperText={errors.clienteDni?.message} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="clienteTelefono"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label="Telefono" InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={16} /></InputAdornment> }} error={!!errors.clienteTelefono} helperText={errors.clienteTelefono?.message} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="clienteEmail"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth type="email" label="Email" InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={16} /></InputAdornment> }} error={!!errors.clienteEmail} helperText={errors.clienteEmail?.message} />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapPin size={20} /> Direccion
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="clienteDireccion"
                      control={control}
                      render={({ field }) => <TextField {...field} fullWidth label="Calle" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Controller
                      name="clienteAltura"
                      control={control}
                      render={({ field }) => <TextField {...field} fullWidth label="N°" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="clienteCp"
                      control={control}
                      render={({ field }) => <TextField {...field} fullWidth label="Codigo Postal" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="clienteProvincia"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          options={PROVINCIAS_ARGENTINA}
                          value={field.value || null}
                          onChange={(_, value) => field.onChange(value || '')}
                          renderInput={(params) => <TextField {...params} label="Provincia" />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="clienteLocalidad"
                      control={control}
                      render={({ field }) => <TextField {...field} fullWidth label="Localidad" />}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Shield size={20} /> Detalles de la Poliza
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="aseguradora"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          freeSolo
                          options={ASEGURADORAS}
                          value={field.value}
                          onChange={(_, value) => field.onChange(value || '')}
                          onInputChange={(_, value) => field.onChange(value || '')}
                          renderInput={(params) => <TextField {...params} label="Aseguradora" error={!!errors.aseguradora} helperText={errors.aseguradora?.message} />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="rubro"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          freeSolo
                          options={GENERAL_RUBRO_OPTIONS}
                          groupBy={(option) => (typeof option === 'string' ? 'Otros' : option.category)}
                          getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                          value={GENERAL_RUBRO_OPTIONS.find((option) => option.label === field.value) || field.value}
                          onChange={(_, value) => field.onChange(typeof value === 'string' ? value : value?.label || '')}
                          onInputChange={(_, value) => field.onChange(value || '')}
                          renderInput={(params) => <TextField {...params} label="Rubro" error={!!errors.rubro} helperText={errors.rubro?.message} />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="numeroPoliza"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label="Numero de Poliza" InputProps={{ startAdornment: <InputAdornment position="start"><Hash size={16} /></InputAdornment> }} error={!!errors.numeroPoliza} helperText={errors.numeroPoliza?.message} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="fechaInicio"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth type="date" label="Fecha Inicio" InputLabelProps={{ shrink: true }} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="fechaVencimiento"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="date"
                          label="Fecha Vencimiento"
                          InputLabelProps={{ shrink: true }}
                          onChange={(event) => {
                            setManualVencimiento(true);
                            field.onChange(event);
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="medioPago"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth select label="Medio de Pago" error={!!errors.medioPago} helperText={errors.medioPago?.message}>
                          {PAYMENT_OPTIONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="vigencia"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          select
                          label="Vigencia"
                          error={!!errors.vigencia}
                          helperText={errors.vigencia?.message}
                          onChange={(event) => {
                            setManualVencimiento(false);
                            field.onChange(event);
                          }}
                        >
                          {VIGENCIA_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Building2 size={20} /> Resumen Economico
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                <Box sx={{ mb: 3 }}>
                  <Controller
                    name="prima"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        name={field.name}
                        inputRef={field.ref}
                        onBlur={field.onBlur}
                        value={typeof field.value === 'number' && field.value > 0 ? formatAmount(field.value) : ''}
                        fullWidth
                        label="Prima"
                        onChange={(event) => field.onChange(parseAmount(event.target.value))}
                        placeholder="45.000"
                        inputMode="decimal"
                        error={!!errors.prima}
                        helperText={errors.prima?.message}
                        FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.85)' } }}
                        sx={{
                          '& .MuiOutlinedInput-root': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        }}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Controller
                    name="moneda"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="Moneda"
                        sx={{
                          '& .MuiOutlinedInput-root': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                          '& .MuiSvgIcon-root': { color: 'white' },
                        }}
                      >
                        <MenuItem value="ARS">ARS — Peso Argentino</MenuItem>
                        <MenuItem value="USD">USD — Dólar Estadounidense</MenuItem>
                        <MenuItem value="EUR">EUR — Euro</MenuItem>
                        <MenuItem value="BRL">BRL — Real Brasileño</MenuItem>
                      </TextField>
                    )}
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Controller
                    name="porcentajeComision"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Porcentaje Comision (%)"
                        type="number"
                        onChange={(event) => field.onChange(parseFloat(event.target.value) || 0)}
                        sx={{
                          '& .MuiOutlinedInput-root': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        }}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, mb: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Comision Estimada</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>$ {formatAmount(comisionCalculada)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>Tipo detectado</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{policyType === 'EMPRESA' ? 'Empresa' : 'Individual'}</Typography>
                </Box>
              </CardContent>
            </Card>

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              disabled={saving}
              startIcon={<Save size={20} />}
              sx={{ py: 2, borderRadius: 3, fontWeight: 700 }}
            >
              {saving ? 'Guardando...' : 'Guardar Poliza'}
            </Button>
          </Grid>
        </Grid>
      </form>

      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}>
        <Alert severity="success" onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}>
          Poliza guardada exitosamente.
        </Alert>
      </Snackbar>
    </Box>
  );
};
