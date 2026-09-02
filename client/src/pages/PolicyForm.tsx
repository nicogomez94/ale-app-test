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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Building2, Hash, HeartPulse, Mail, MapPin, Phone, Save, Shield, Sparkles, Upload, User } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, PolicyPayload } from '../api';
import { DEBUG, debugData } from '../data/debugData';
import {
  ASEGURADORAS,
  calculateVencimiento,
  GENERAL_RUBRO_OPTIONS,
  getQuotaTotalFromVigencia,
  PAYMENT_OPTIONS,
  PolicyVigencia,
  PROVINCIAS_ARGENTINA,
  VIGENCIA_OPTIONS,
} from '../data/policyCatalogs';

const schema = z.object({
  policyMode: z.enum(['CLIENTE', 'EMPRESA', 'VIDA_RETIRO']).default('CLIENTE'),
  vidaRetiroTipo: z.enum(['VIDA', 'RETIRO']).default('VIDA'),
  clienteNombre: z.string().optional(),
  clienteDni: z.string().optional(),
  clienteTelefono: z.string().optional(),
  clienteEmail: z.string().optional(),
  clienteDireccion: z.string().optional(),
  clienteAltura: z.string().optional(),
  clienteCp: z.string().optional(),
  clienteProvincia: z.string().optional(),
  clienteLocalidad: z.string().optional(),
  aseguradora: z.string().optional(),
  rubro: z.string().optional(),
  numeroPoliza: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  medioPago: z.enum(['Cupon', 'Tarjeta de credito', 'Debito por CBU']).optional(),
  vigencia: z.enum(['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']).optional(),
  prima: z.number().optional(),
  porcentajeComision: z.number().optional(),
  moneda: z.enum(['ARS', 'USD', 'EUR', 'BRL']).default('ARS'),
  sumaAsegurada: z.number().optional(),
  aporteMensual: z.number().optional(),
  fondoAcumulado: z.number().optional(),
}).superRefine((data, ctx) => {
  const addIssue = (path: string, message: string) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  };

  if (!data.clienteNombre || data.clienteNombre.trim().length < 3) addIssue('clienteNombre', 'Nombre requerido (min. 3 caracteres)');
  if (!data.clienteDni || data.clienteDni.trim().length < 7) addIssue('clienteDni', 'DNI/CUIT invalido');
  if (!data.aseguradora?.trim()) addIssue('aseguradora', 'Aseguradora requerida');

  if (data.policyMode !== 'VIDA_RETIRO') {
    if (!data.clienteTelefono || data.clienteTelefono.trim().length < 8) addIssue('clienteTelefono', 'Telefono requerido');
    if (!data.clienteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.clienteEmail)) addIssue('clienteEmail', 'Email invalido');
    if (!data.rubro?.trim()) addIssue('rubro', 'Rubro requerido');
    if (!data.numeroPoliza?.trim()) addIssue('numeroPoliza', 'Numero de poliza requerido');
    if (!data.fechaInicio) addIssue('fechaInicio', 'Fecha de inicio requerida');
    if (!data.fechaVencimiento) addIssue('fechaVencimiento', 'Fecha de vencimiento requerida');
    if (!data.medioPago) addIssue('medioPago', 'Medio de pago requerido');
    if (!data.vigencia) addIssue('vigencia', 'Vigencia requerida');
    if (!data.prima || data.prima <= 0) addIssue('prima', 'Prima debe ser mayor a 0');
    if (data.porcentajeComision == null || data.porcentajeComision < 0 || data.porcentajeComision > 100) addIssue('porcentajeComision', 'Comision invalida');
  }
});

type FormData = z.input<typeof schema>;

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

export type PolicyFormProps = {
  embedded?: boolean;
  initialMode?: 'CLIENTE' | 'EMPRESA' | 'VIDA_RETIRO';
  lockMode?: boolean;
  initialClient?: any;
  onSaved?: () => void;
};

export const PolicyForm: React.FC<PolicyFormProps> = ({ embedded = false, initialMode, lockMode, initialClient, onSaved }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state || {}) as { policyMode?: 'CLIENTE' | 'EMPRESA' | 'VIDA_RETIRO'; lockPolicyMode?: boolean; client?: any };
  const routeState = embedded
    ? { policyMode: initialMode || 'CLIENTE', lockPolicyMode: lockMode ?? false, client: initialClient }
    : locationState;
  const initialPolicyMode = routeState.policyMode || 'CLIENTE';
  const lockPolicyMode = !!routeState.lockPolicyMode;
  const [snackOpen, setSnackOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualVencimiento, setManualVencimiento] = useState(false);
  const [directoryInsurers, setDirectoryInsurers] = useState<string[]>([]);
  const [couponFile, setCouponFile] = useState<File | null>(null);

  const defaultFechaInicio = new Date().toISOString().split('T')[0];

  const defaultValues = useMemo<FormData>(() => {
    if (DEBUG) {
      return {
        policyMode: initialPolicyMode,
        vidaRetiroTipo: 'VIDA',
        ...debugData.policy,
      } as FormData;
    }

    return {
      policyMode: initialPolicyMode,
      vidaRetiroTipo: 'VIDA',
      clienteNombre: routeState.client?.nombre || '',
      clienteDni: routeState.client?.dni || '',
      clienteTelefono: routeState.client?.telefono || '',
      clienteEmail: routeState.client?.email || '',
      clienteDireccion: routeState.client?.direccion || '',
      clienteAltura: routeState.client?.altura || '',
      clienteCp: routeState.client?.cp || '',
      clienteProvincia: routeState.client?.provincia || '',
      clienteLocalidad: routeState.client?.localidad || '',
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
      sumaAsegurada: undefined,
      aporteMensual: undefined,
      fondoAcumulado: undefined,
    };
  }, [defaultFechaInicio, initialPolicyMode, routeState.client]);

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
  const medioPago = watch('medioPago');
  const policyMode = watch('policyMode') || 'CLIENTE';
  const vidaRetiroTipo = watch('vidaRetiroTipo') || 'VIDA';

  useEffect(() => {
    if (!manualVencimiento && fechaInicio && fechaVigencia) {
      setValue('fechaVencimiento', calculateVencimiento(fechaInicio, fechaVigencia));
    }
  }, [fechaInicio, fechaVigencia, manualVencimiento, setValue]);

  const primaValue = typeof prima === 'number' && Number.isFinite(prima) ? prima : 0;
  const porcentajeValue = typeof porcentaje === 'number' && Number.isFinite(porcentaje) ? porcentaje : 0;
  const comisionCalculada = primaValue * (porcentajeValue / 100);
  const policyType = policyMode === 'EMPRESA' ? 'EMPRESA' : 'INDIVIDUAL';
  const aseguradoraOptions = useMemo(
    () => Array.from(new Set([...directoryInsurers, ...ASEGURADORAS])),
    [directoryInsurers]
  );

  useEffect(() => {
    api.directory.insurers.list()
      .then((data) => setDirectoryInsurers(data.map((insurer: any) => insurer.razonSocial).filter(Boolean)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (medioPago !== 'Cupon') setCouponFile(null);
  }, [medioPago]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');

    try {
      if (data.policyMode === 'VIDA_RETIRO') {
        await api.lifePolicies.create({
          cliente: data.clienteNombre?.trim(),
          cuit: data.clienteDni?.trim(),
          aseguradora: data.aseguradora?.trim(),
          tipo: data.vidaRetiroTipo || 'VIDA',
          sumaAsegurada: data.vidaRetiroTipo === 'VIDA' ? data.sumaAsegurada : undefined,
          prima: data.vidaRetiroTipo === 'VIDA' ? data.prima : undefined,
          aporteMensual: data.vidaRetiroTipo === 'RETIRO' ? data.aporteMensual : undefined,
          fondoAcumulado: data.vidaRetiroTipo === 'RETIRO' ? data.fondoAcumulado : undefined,
          email: data.clienteEmail?.trim() || undefined,
          telefono: data.clienteTelefono?.trim() || undefined,
          direccion: data.clienteDireccion?.trim() || undefined,
          cp: data.clienteCp?.trim() || undefined,
          localidad: data.clienteLocalidad?.trim() || undefined,
          provincia: data.clienteProvincia || undefined,
        });
        setSnackOpen(true);
        if (embedded) onSaved?.();
        else setTimeout(() => navigate('/vida-y-retiro'), 1200);
        return;
      }

      const groupId = createGroupId();
      const vigencia = (data.vigencia || 'ANUAL') as PolicyVigencia;
      const cuotaTotal = getQuotaTotalFromVigencia(vigencia);
      const payload: PolicyPayload = {
        clienteId: routeState.client?.id || undefined,
        clienteNombre: data.clienteNombre || '',
        clienteDni: data.clienteDni || '',
        clienteTelefono: data.clienteTelefono || '',
        clienteEmail: data.clienteEmail || '',
        clienteDireccion: data.clienteDireccion || '',
        clienteAltura: data.clienteAltura || '',
        clienteCp: data.clienteCp || '',
        clienteProvincia: data.clienteProvincia || '',
        clienteLocalidad: data.clienteLocalidad || '',
        aseguradora: data.aseguradora || '',
        rubro: data.rubro || '',
        numeroPoliza: data.numeroPoliza || '',
        fechaInicio: data.fechaInicio || '',
        fechaVencimiento: data.fechaVencimiento || '',
        medioPago: data.medioPago || 'Cupon',
        vigencia,
        prima: data.prima || 0,
        porcentajeComision: data.porcentajeComision || 0,
        groupId,
        cuotaActual: 1,
        cuotaTotal,
        pagada: false,
        tipo: policyType,
        moneda: data.moneda ?? 'ARS',
      };

      const created = await api.policies.create(payload);
      if (data.medioPago === 'Cupon' && couponFile && created?.id) await api.policies.coupon.upload(created.id, couponFile);
      setSnackOpen(true);
      if (embedded) onSaved?.();
      else setTimeout(() => navigate(policyType === 'EMPRESA' ? '/empresas' : '/clientes'), 1200);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la poliza');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1380, mx: 'auto', bgcolor: 'background.paper', p: { xs: 2, md: 3 }, borderRadius: embedded ? 0 : 4, boxShadow: embedded ? 'none' : '0 18px 50px rgba(20,31,80,.12)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
        {policyMode === 'EMPRESA' ? 'Nueva Póliza de Empresa' : policyMode === 'VIDA_RETIRO' ? 'Nueva Póliza de Vida y Retiro' : 'Nueva Póliza de Cliente'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card variant="outlined" sx={{ mb: 3, borderStyle: 'dashed', borderColor: 'primary.main', bgcolor: '#f8f9ff' }}><CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', py: '14px !important' }}><Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}><Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}><Sparkles size={20} /></Box><Box><Typography fontWeight={900}>Carga Inteligente por IA ✨</Typography><Typography variant="body2" color="text.secondary">Subí la póliza en PDF y el sistema completará los campos automáticamente.</Typography></Box></Box><Button variant="contained" startIcon={<Upload size={17} />} onClick={() => navigate('/polizas/importar')}>Subir PDF de Póliza</Button></CardContent></Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            {!lockPolicyMode && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Shield size={20} /> Tipo de Alta
                </Typography>
                <Controller
                  name="policyMode"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={field.value}
                      onChange={(_, value) => value && field.onChange(value)}
                      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1, '& .MuiToggleButton-root': { border: '1px solid', borderColor: 'divider', borderRadius: 2 } }}
                    >
                      <ToggleButton value="CLIENTE" sx={{ gap: 1 }}><User size={18} />Cliente</ToggleButton>
                      <ToggleButton value="EMPRESA" sx={{ gap: 1 }}><Building2 size={18} />Empresa</ToggleButton>
                      <ToggleButton value="VIDA_RETIRO" sx={{ gap: 1 }}><HeartPulse size={18} />Vida y Retiro</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
              </CardContent>
            </Card>
            )}

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
                        <TextField {...field} fullWidth label={policyMode === 'EMPRESA' ? 'Empresa / Razon Social' : 'Nombre Completo'} error={!!errors.clienteNombre} helperText={errors.clienteNombre?.message} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="clienteDni"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label={policyMode === 'EMPRESA' ? 'CUIT' : 'DNI / CUIT'} error={!!errors.clienteDni} helperText={errors.clienteDni?.message} />
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

            {policyMode !== 'VIDA_RETIRO' ? (
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
                          options={aseguradoraOptions}
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
            ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HeartPulse size={20} /> Datos de Vida y Retiro
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
                          options={aseguradoraOptions}
                          value={field.value || ''}
                          onChange={(_, value) => field.onChange(value || '')}
                          onInputChange={(_, value) => field.onChange(value || '')}
                          renderInput={(params) => <TextField {...params} label="Aseguradora" error={!!errors.aseguradora} helperText={errors.aseguradora?.message} />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="vidaRetiroTipo"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select fullWidth label="Tipo">
                          <MenuItem value="VIDA">Vida</MenuItem>
                          <MenuItem value="RETIRO">Retiro</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                  {vidaRetiroTipo === 'VIDA' ? (
                    <>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                          name="sumaAsegurada"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="Suma Asegurada"
                              value={typeof field.value === 'number' && field.value > 0 ? formatAmount(field.value) : ''}
                              onChange={(event) => field.onChange(parseAmount(event.target.value))}
                              inputMode="decimal"
                              inputProps={{ step: '0.01' }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                          name="prima"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="Prima Mensual"
                              value={typeof field.value === 'number' && field.value > 0 ? formatAmount(field.value) : ''}
                              onChange={(event) => field.onChange(parseAmount(event.target.value))}
                              inputMode="decimal"
                            />
                          )}
                        />
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                          name="aporteMensual"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="Aporte Mensual"
                              value={typeof field.value === 'number' && field.value > 0 ? formatAmount(field.value) : ''}
                              onChange={(event) => field.onChange(parseAmount(event.target.value))}
                              inputMode="decimal"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                          name="fondoAcumulado"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              label="Fondo Acumulado"
                              value={typeof field.value === 'number' && field.value > 0 ? formatAmount(field.value) : ''}
                              onChange={(event) => field.onChange(parseAmount(event.target.value))}
                              inputMode="decimal"
                            />
                          )}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {policyMode !== 'VIDA_RETIRO' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Building2 size={20} /> Datos Economicos
                </Typography>
                <Divider sx={{ mb: 2 }} />
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
                        inputProps={{ step: '0.01' }}
                        error={!!errors.prima}
                        helperText={errors.prima?.message}
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
                        error={!!errors.porcentajeComision}
                        helperText={errors.porcentajeComision?.message}
                      />
                    )}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Comision estimada: $ {formatAmount(comisionCalculada)}
                </Typography>
              </CardContent>
            </Card>
            )}

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
              {saving ? 'Guardando...' : policyMode === 'VIDA_RETIRO' ? 'Guardar Vida y Retiro' : 'Guardar Poliza'}
            </Button>
          </Grid>
        </Grid>
        {policyMode !== 'VIDA_RETIRO' && medioPago === 'Cupon' && <Card variant="outlined" sx={{ mt: 3, borderRadius: 3 }}><CardContent><Typography fontWeight={900} color="primary" sx={{ mb: 1.5 }}>CUPÓN DE PAGO (PDF)</Typography><Button component="label" fullWidth variant="outlined" startIcon={<Upload />} sx={{ minHeight: 110, borderStyle: 'dashed', borderWidth: 2, display: 'flex', flexDirection: 'column', gap: 1 }}><Typography fontWeight={800}>{couponFile ? couponFile.name : 'Arrastrá tu archivo PDF aquí o hacé clic para buscar'}</Typography><Typography variant="caption" color="text.secondary">Disponible únicamente para pólizas con pago por cupón.</Typography><input hidden type="file" accept="application/pdf" onChange={(e) => setCouponFile(e.target.files?.[0] || null)} /></Button></CardContent></Card>}
      </form>

      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}>
        <Alert severity="success" onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}>
          Poliza guardada exitosamente.
        </Alert>
      </Snackbar>
    </Box>
  );
};
