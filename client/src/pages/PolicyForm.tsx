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
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import { Building2, Coins, FileText, HeartPulse, Phone, Save, Shield, Sparkles, User, UserCheck } from 'lucide-react';
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
  tipoSeguro: z.string().optional(),
  edad: z.number().int().min(0).optional(),
  edadRetiro: z.number().int().min(0).optional(),
  incremento: z.number().min(0).optional(),
  frecuenciaIncremento: z.string().optional(),
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

function createGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `group-${Date.now()}`;
}

export type PolicyFormProps = {
  embedded?: boolean;
  initialMode?: 'CLIENTE' | 'EMPRESA' | 'VIDA_RETIRO';
  initialLifeType?: 'VIDA' | 'RETIRO';
  lockMode?: boolean;
  initialClient?: any;
  onSaved?: () => void;
};

export const PolicyForm: React.FC<PolicyFormProps> = ({ embedded = false, initialMode, initialLifeType = 'VIDA', lockMode, initialClient, onSaved }) => {
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
  const [linkedClient, setLinkedClient] = useState(routeState.client);
  const [couponFile, setCouponFile] = useState<File | null>(null);

  const defaultFechaInicio = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

  const defaultValues = useMemo<FormData>(() => {
    if (DEBUG && !routeState.client) {
      return {
        policyMode: initialPolicyMode,
        vidaRetiroTipo: initialLifeType,
        moneda: 'ARS',
        frecuenciaIncremento: 'MENSUAL',
        incremento: 0,
        ...debugData.policy,
      } as FormData;
    }

    return {
      policyMode: initialPolicyMode,
      vidaRetiroTipo: initialLifeType,
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
      tipoSeguro: '',
      frecuenciaIncremento: 'MENSUAL',
      incremento: 0,
    };
  }, [defaultFechaInicio, initialPolicyMode, initialLifeType, routeState.client]);

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
  const medioPago = watch('medioPago');
  const policyMode = watch('policyMode') || 'CLIENTE';
  const vidaRetiroTipo = watch('vidaRetiroTipo') || 'VIDA';

  useEffect(() => {
    if (!manualVencimiento && fechaInicio && fechaVigencia) {
      setValue('fechaVencimiento', calculateVencimiento(fechaInicio, fechaVigencia));
    }
  }, [fechaInicio, fechaVigencia, manualVencimiento, setValue]);

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
        const lifeData = {
          cliente: data.clienteNombre?.trim(),
          cuit: data.clienteDni?.trim(),
          aseguradora: data.aseguradora?.trim(),
          tipo: data.vidaRetiroTipo || 'VIDA',
          sumaAsegurada: data.vidaRetiroTipo === 'VIDA' ? data.sumaAsegurada : undefined,
          prima: data.prima,
          tipoSeguro: data.tipoSeguro,
          edad: data.edad, edadRetiro: data.vidaRetiroTipo === 'RETIRO' ? data.edadRetiro : undefined,
          incremento: data.vidaRetiroTipo === 'RETIRO' ? data.incremento : undefined,
          frecuenciaIncremento: data.vidaRetiroTipo === 'RETIRO' ? data.frecuenciaIncremento : undefined,
          numeroPoliza: data.numeroPoliza, medioPago: data.medioPago,
          fechaInicio: data.fechaInicio, fechaVencimiento: data.fechaVencimiento,
          vigencia: data.vigencia, moneda: data.moneda, altura: data.clienteAltura,
          aporteMensual: data.vidaRetiroTipo === 'RETIRO' ? data.aporteMensual : undefined,
          fondoAcumulado: data.vidaRetiroTipo === 'RETIRO' ? data.fondoAcumulado : undefined,
          email: data.clienteEmail?.trim() || undefined,
          telefono: data.clienteTelefono?.trim() || undefined,
          direccion: data.clienteDireccion?.trim() || undefined,
          cp: data.clienteCp?.trim() || undefined,
          localidad: data.clienteLocalidad?.trim() || undefined,
          provincia: data.clienteProvincia || undefined,
        };
        if (data.medioPago === 'Cupon' && couponFile) await api.lifePolicies.createWithCoupon(lifeData, couponFile);
        else await api.lifePolicies.create(lifeData);
        setSnackOpen(true);
        if (embedded) onSaved?.();
        else setTimeout(() => navigate('/vida-y-retiro'), 1200);
        return;
      }

      const groupId = createGroupId();
      const vigencia = (data.vigencia || 'ANUAL') as PolicyVigencia;
      const cuotaTotal = getQuotaTotalFromVigencia(vigencia);
      const payload: PolicyPayload = {
        clienteId: linkedClient?.id || undefined,
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

  const isLife = policyMode === 'VIDA_RETIRO';
  const activeTab = isLife ? vidaRetiroTipo : policyMode;
  const accent = activeTab === 'RETIRO' ? '#efa516' : activeTab === 'VIDA' ? '#d32f2f' : '#1a237e';
  const panel = { borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 3px 12px rgba(0,0,0,.025)', p: 2 };
  const heading = (icon: React.ReactNode, title: string) => <><Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, color: accent, fontWeight: 850, fontSize: 15, mb: 1.5 }}>{icon}{title}</Typography><Divider sx={{ mb: 1.5 }} /></>;
  const input = (name: keyof FormData, label: string, width = 6, type = 'text', options?: {value: string; label: string}[]) => (
    <Grid key={name} size={{ xs: 12, sm: width }}>
      <Controller name={name} control={control} render={({ field }) => (
        <TextField name={field.name} inputRef={field.ref} onBlur={field.onBlur} value={field.value ?? ''}
          fullWidth label={label} type={type} select={Boolean(options)} InputLabelProps={{ shrink: true }}
          inputProps={type === 'number' ? { min: 0, step: name === 'edad' || name === 'edadRetiro' ? 1 : 'any' } : undefined}
          error={!!errors[name]} helperText={errors[name]?.message}
          InputProps={name === 'clienteTelefono' ? { startAdornment: <InputAdornment position="start"><Phone size={17}/></InputAdornment> } : name === 'prima' ? { startAdornment: <InputAdornment position="start">$</InputAdornment> } : undefined}
          onChange={event => {
            if (name === 'fechaVencimiento') setManualVencimiento(true);
            if (name === 'vigencia') setManualVencimiento(false);
            field.onChange(type === 'number' ? (event.target.value === '' ? undefined : Number(event.target.value)) : event.target.value);
          }}>
          {options?.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      )}/>
    </Grid>
  );
  const selectOptions = (values: string[]) => values.map(value => ({ value, label: value }));
  const acceptCoupon = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) { setError('La cuponera debe ser un archivo PDF.'); return; }
    setError('');
    setCouponFile(file);
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto', bgcolor: 'background.paper', p: { xs: 2, md: 3 }, borderRadius: embedded ? 0 : 4,
      '& .MuiOutlinedInput-root': { borderRadius: '15px' }, '& .MuiInputBase-input': { py: 1.55 }, '& .MuiInputLabel-root': { bgcolor: 'background.paper', px: .4 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 1.5 }}>
        <Typography variant="h4" sx={{ color: accent, fontSize: 28, fontWeight: 900 }}>Nueva Póliza</Typography>
        <Tabs value={activeTab} variant="scrollable" scrollButtons="auto" aria-label="Tipo de póliza" sx={{ ml: { md: 'auto' }, alignSelf: { md: 'flex-end' }, '& .MuiTabs-flexContainer': { justifyContent: { md: 'flex-end' } }, '& .MuiTabs-indicator': { bgcolor: accent, height: 4 }, '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 800 }, '& .Mui-selected': { color: accent + ' !important' } }}
          onChange={(_, value) => {
            setValue('policyMode', value === 'VIDA' || value === 'RETIRO' ? 'VIDA_RETIRO' : value);
            if (value === 'VIDA' || value === 'RETIRO') setValue('vidaRetiroTipo', value);
            setValue('tipoSeguro', '');
          }}>
          <Tab value="CLIENTE" label="Clientes" icon={<User size={18}/>} iconPosition="start" disabled={lockPolicyMode && initialPolicyMode !== 'CLIENTE'}/>
          <Tab value="EMPRESA" label="Empresas" icon={<Building2 size={18}/>} iconPosition="start" disabled={lockPolicyMode && initialPolicyMode !== 'EMPRESA'}/>
          <Tab value="VIDA" label="Vida" icon={<HeartPulse size={18}/>} iconPosition="start" disabled={lockPolicyMode && initialPolicyMode !== 'VIDA_RETIRO'}/>
          <Tab value="RETIRO" label="Retiro" icon={<Coins size={18}/>} iconPosition="start" disabled={lockPolicyMode && initialPolicyMode !== 'VIDA_RETIRO'}/>
        </Tabs>
      </Box>
      {linkedClient && <Alert icon={<UserCheck size={22}/>} severity="success" onClose={() => setLinkedClient(null)} sx={{ mb: 2, border: '1px solid #86b88d', borderRadius: 4, py: 1.2, fontWeight: 750 }}>
        Vinculado con cliente registrado: {linkedClient.nombre}. Los datos personales han sido precompletados automáticamente.
      </Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card variant="outlined" sx={{ mb: 2, borderRadius: 3, borderStyle: 'dashed', borderColor: '#8685a7', bgcolor: 'action.hover', boxShadow: 'none' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', py: '16px !important' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}><Sparkles size={23}/></Box>
            <Box><Typography fontWeight={850}>Carga Inteligente por IA ✨</Typography><Typography variant="body2" color="text.secondary">Sube la póliza en PDF o imagen y la IA completará los campos automáticamente.</Typography></Box>
          </Box>
          <Button variant="contained" startIcon={<Sparkles size={17}/>} onClick={() => navigate('/polizas/importar')}>Subir PDF de Póliza</Button>
        </CardContent>
      </Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={panel}>
              {heading(<User size={20}/>, isLife ? 'DATOS DEL ASEGURADO (CLIENTE)' : policyMode === 'EMPRESA' ? 'DATOS DE LA EMPRESA' : 'DATOS DEL CLIENTE')}
              <Grid container spacing={1.5}>
                {input('clienteNombre', policyMode === 'EMPRESA' ? 'Razón Social' : isLife ? 'Asegurado' : 'Nombre Completo', 12)}
                {input('clienteDni', isLife ? 'DNI' : 'DNI / CUIT', 12)}
                {input('clienteTelefono', 'Teléfono')}
                {input('clienteEmail', 'Email', 6, 'email')}
                {input('clienteDireccion', 'Calle', 9)}
                {input('clienteAltura', 'N°', 3)}
                {input('clienteCp', 'C.P.', 4)}
                {input('clienteLocalidad', 'Localidad', 8)}
                {input('clienteProvincia', 'Provincia', 12, 'text', selectOptions(PROVINCIAS_ARGENTINA))}
              </Grid>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={panel}>
              {heading(<Shield size={20}/>, 'DETALLES DE LA PÓLIZA')}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}><Controller name="aseguradora" control={control} render={({field}) => <Autocomplete freeSolo options={aseguradoraOptions} value={field.value || ''} onInputChange={(_, value) => field.onChange(value)} onChange={(_, value) => field.onChange(value || '')} renderInput={params => <TextField {...params} label="Aseguradora" InputLabelProps={{shrink:true}} error={!!errors.aseguradora} helperText={errors.aseguradora?.message}/>}/>} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Controller name={isLife ? 'tipoSeguro' : 'rubro'} control={control} render={({field}) => <Autocomplete freeSolo
                  options={isLife ? [vidaRetiroTipo === 'RETIRO' ? 'Seguro de Retiro Individual' : 'Seguro de Vida Individual'] : GENERAL_RUBRO_OPTIONS.map(o => o.label)}
                  value={field.value || ''} onInputChange={(_,value) => field.onChange(value)} onChange={(_,value) => field.onChange(value || '')}
                  renderInput={params => <TextField {...params} label={isLife ? 'Tipo de Seguro (' + (vidaRetiroTipo === 'RETIRO' ? 'Retiro' : 'Vida') + ')' : 'Rubro (' + (policyMode === 'EMPRESA' ? 'Empresas' : 'Particulares') + ')'} InputLabelProps={{shrink:true}} error={!!errors.rubro} helperText={errors.rubro?.message}/>}/>} /></Grid>
                {isLife && <>
                  {input('edad', 'Edad', 6, 'number')}
                  {vidaRetiroTipo === 'RETIRO' ? <>
                    {input('edadRetiro', 'Edad de Retiro', 6, 'number')}
                    {input('aporteMensual', 'Capital a Aportar', 6, 'number')}
                    {input('incremento', 'Incremento (%)', 6, 'number')}
                    {input('frecuenciaIncremento', 'Frec. Incremento', 6, 'text', VIGENCIA_OPTIONS)}
                  </> : input('sumaAsegurada', 'Suma Asegurada', 6, 'number')}
                </>}
                {input('numeroPoliza', 'Número de Póliza')}
                {input('medioPago', 'Medio de Pago', 6, 'text', selectOptions(PAYMENT_OPTIONS))}
                {input('fechaInicio', 'Fecha Inicio', 6, 'date')}
                {input('fechaVencimiento', 'Fecha Vencimiento', 6, 'date')}
                {input('vigencia', 'Vigencia', 12, 'text', VIGENCIA_OPTIONS)}
                {input('prima', 'Valor Prima', 6, 'number')}
                {input('moneda', 'Tipo de Moneda', 6, 'text', [{value:'ARS',label:'Pesos (ARS)'},{value:'USD',label:'Dólares (USD)'},{value:'EUR',label:'Euros (EUR)'},{value:'BRL',label:'Reales (BRL)'}])}
              </Grid>
            </Box>
          </Grid>
          {medioPago === 'Cupon' && <Grid size={12}><Box sx={panel}>
            {heading(<FileText size={20}/>, 'CUPÓN DE PAGO (PDF)')}
            <Button component="label" fullWidth onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); acceptCoupon(event.dataTransfer.files[0]); }}
              sx={{ minHeight: 180, border: '2px dashed', borderColor: 'divider', borderRadius: 3, bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 1, color: 'text.primary' }}>
              <FileText size={36} color="#999"/>
              <Typography fontWeight={800}>{couponFile ? couponFile.name : 'Arrastra y suelta tu archivo PDF aquí o haz clic para buscar'}</Typography>
              <Typography variant="body2" color="text.secondary">Soporta únicamente formato PDF</Typography>
              <input hidden type="file" accept="application/pdf,.pdf" onChange={event => acceptCoupon(event.target.files?.[0])}/>
            </Button>
            {couponFile && <Button color="error" size="small" onClick={() => setCouponFile(null)}>Quitar archivo</Button>}
          </Box></Grid>}
          <Grid size={12}><Button type="submit" fullWidth variant="contained" disabled={saving} startIcon={<Save size={20}/>} sx={{ py: 1.8 }}>{saving ? 'Guardando...' : 'Guardar Póliza'}</Button></Grid>
        </Grid>
      </form>
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}><Alert severity="success">Póliza guardada exitosamente.</Alert></Snackbar>
    </Box>
  );
};
