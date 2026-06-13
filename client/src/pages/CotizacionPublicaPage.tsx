import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Divider,
  ToggleButtonGroup, ToggleButton,
  CircularProgress, Alert, InputAdornment
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Car, Home, Package, CheckCircle2 } from 'lucide-react';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';

// ─── Types ────────────────────────────────────────────────────────────────────
type CotizacionTipo = 'AUTO' | 'MOTO' | 'HOGAR' | 'OTROS';

const TIPO_CONFIG: Record<CotizacionTipo, { label: string; icon: React.ReactNode }> = {
  AUTO:  { label: 'Auto',  icon: <Car size={18} /> },
  MOTO:  { label: 'Moto',  icon: <TwoWheelerIcon sx={{ fontSize: 18 }} /> },
  HOGAR: { label: 'Hogar', icon: <Home size={18} /> },
  OTROS: { label: 'Otros', icon: <Package size={18} /> },
};

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = apiUrl ? `${apiUrl}/api` : '/api';

const buildCotizacionPayload = (
  tipo: CotizacionTipo,
  form: {
    nombre: string; apellido: string; cuitCuil: string; fechaNacimiento: string;
    email: string; celular: string; calle: string; cp: string; localidad: string; provincia: string;
    marca: string; modelo: string; anio: string; patente: string; tipoUso: string;
    tieneGnc: boolean; tieneGps: boolean; formaPago: string;
    tipoVivienda: string; superficieCubierta: string; descripcionRiesgo: string;
  }
) => {
  const isAutoMoto = tipo === 'AUTO' || tipo === 'MOTO';
  const isHogar = tipo === 'HOGAR';
  const isOtros = tipo === 'OTROS';

  return {
    tipo,
    ...form,
    marca: isAutoMoto ? form.marca : null,
    modelo: isAutoMoto ? form.modelo : null,
    anio: isAutoMoto ? form.anio : null,
    patente: isAutoMoto ? form.patente : null,
    tipoUso: isAutoMoto ? form.tipoUso : null,
    tieneGnc: tipo === 'AUTO' ? form.tieneGnc : null,
    tieneGps: isAutoMoto ? form.tieneGps : null,
    tipoVivienda: isHogar ? form.tipoVivienda : null,
    superficieCubierta: isHogar ? form.superficieCubierta : null,
    descripcionRiesgo: isOtros ? form.descripcionRiesgo : null,
  };
};

const formatDateMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const CotizacionPublicaPage: React.FC = () => {
  const { userId, tipo: tipoParam } = useParams<{ userId: string; tipo?: string }>();

  const initialTipo = (['auto', 'moto', 'hogar', 'otros'].includes(tipoParam ?? '')
    ? tipoParam!.toUpperCase()
    : 'AUTO') as CotizacionTipo;

  const [tipo, setTipo] = useState<CotizacionTipo>(initialTipo);
  const [form, setForm] = useState({
    nombre: '', apellido: '', cuitCuil: '', fechaNacimiento: '',
    email: '', celular: '',
    calle: '', cp: '', localidad: '', provincia: '',
    marca: '', modelo: '', anio: '', patente: '', tipoUso: 'Particular',
    tieneGnc: false, tieneGps: false, formaPago: '',
    tipoVivienda: 'Casa', superficieCubierta: '',
    descripcionRiesgo: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const setF = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const isAutoMoto = tipo === 'AUTO' || tipo === 'MOTO';
  const isHogar = tipo === 'HOGAR';
  const isOtros = tipo === 'OTROS';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/cotizaciones/public/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCotizacionPayload(tipo, form)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al enviar la solicitud');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', p: 2 }}>
        <Card sx={{ maxWidth: 480, width: '100%', borderRadius: 4, textAlign: 'center', p: 4 }}>
          <Box sx={{ color: '#10b981', mb: 2 }}>
            <CheckCircle2 size={64} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>¡Solicitud Enviada!</Typography>
          <Typography color="text.secondary">
            Un productor de seguros se pondrá en contacto contigo a la brevedad.
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 680, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>Solicitud de Cotización</Typography>
          <Typography color="text.secondary">
            Completá el formulario y un asesor de seguros te contactará a la brevedad.
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* Tipo selector */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ¿Qué querés asegurar?
                  </Typography>
                  <ToggleButtonGroup
                    exclusive value={tipo}
                    onChange={(_, v) => v && setTipo(v)}
                    size="small" fullWidth
                  >
                    {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                      <ToggleButton key={k} value={k} sx={{ gap: 1 }}>
                        {v.icon} {v.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Grid>

                <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Tus datos</Typography></Divider></Grid>

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Nombre *" size="small" required value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Apellido" size="small" value={form.apellido} onChange={e => setF('apellido', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="CUIT/CUIL" size="small" value={form.cuitCuil} onChange={e => setF('cuitCuil', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Fecha de Nacimiento" placeholder="dd/mm/aaaa" size="small" value={form.fechaNacimiento} onChange={e => setF('fechaNacimiento', formatDateMask(e.target.value))} inputProps={{ inputMode: 'numeric', maxLength: 10 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email" size="small" type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Celular" size="small" value={form.celular} onChange={e => setF('celular', e.target.value)} />
                </Grid>

                <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Dirección</Typography></Divider></Grid>

                <Grid item xs={12} sm={5}>
                  <TextField fullWidth label="Calle y número" size="small" value={form.calle} onChange={e => setF('calle', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField fullWidth label="CP" size="small" value={form.cp} onChange={e => setF('cp', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="Localidad" size="small" value={form.localidad} onChange={e => setF('localidad', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Provincia</InputLabel>
                    <Select label="Provincia" value={form.provincia} onChange={e => setF('provincia', e.target.value)}>
                      {PROVINCIAS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Auto/Moto */}
                {isAutoMoto && (
                  <>
                    <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Datos del Vehículo</Typography></Divider></Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Marca" size="small" value={form.marca} onChange={e => setF('marca', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Modelo" size="small" value={form.modelo} onChange={e => setF('modelo', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField fullWidth label="Año" size="small" type="number" value={form.anio} onChange={e => setF('anio', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField fullWidth label="Patente" size="small" value={form.patente} onChange={e => setF('patente', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Tipo de Uso</InputLabel>
                        <Select label="Tipo de Uso" value={form.tipoUso} onChange={e => setF('tipoUso', e.target.value)}>
                          <MenuItem value="Particular">Particular</MenuItem>
                          <MenuItem value="Comercial">Comercial</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {tipo === 'AUTO' && (
                      <Grid item xs={12} sm={4}>
                        <TextField select fullWidth size="small" label="GNC" value={form.tieneGnc ? 'SI' : 'NO'} onChange={e => setF('tieneGnc', e.target.value === 'SI')}>
                          <MenuItem value="SI">Sí</MenuItem>
                          <MenuItem value="NO">No</MenuItem>
                        </TextField>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={4}>
                      <TextField select fullWidth size="small" label="GPS / Rastreador" value={form.tieneGps ? 'SI' : 'NO'} onChange={e => setF('tieneGps', e.target.value === 'SI')}>
                        <MenuItem value="SI">Sí</MenuItem>
                        <MenuItem value="NO">No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Forma de Pago Preferida</InputLabel>
                        <Select label="Forma de Pago Preferida" value={form.formaPago} onChange={e => setF('formaPago', e.target.value)}>
                          <MenuItem value="Débito CBU">Débito por CBU</MenuItem>
                          <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                          <MenuItem value="Cupón">Cupón</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}

                {/* Hogar */}
                {isHogar && (
                  <>
                    <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Datos de la Vivienda</Typography></Divider></Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Tipo de Vivienda</InputLabel>
                        <Select label="Tipo de Vivienda" value={form.tipoVivienda} onChange={e => setF('tipoVivienda', e.target.value)}>
                          {['Casa', 'Departamento', 'PH', 'Otro'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth label="Superficie Cubierta" size="small" type="number"
                        value={form.superficieCubierta} onChange={e => setF('superficieCubierta', e.target.value)}
                        InputProps={{ endAdornment: <InputAdornment position="end">m²</InputAdornment> }}
                      />
                    </Grid>
                  </>
                )}

                {/* Otros */}
                {isOtros && (
                  <>
                    <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Descripción</Typography></Divider></Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth label="Describí el bien o riesgo a asegurar"
                        size="small" multiline rows={3}
                        value={form.descripcionRiesgo} onChange={e => setF('descripcionRiesgo', e.target.value)}
                      />
                    </Grid>
                  </>
                )}

                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error">{error}</Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Button
                    type="submit" variant="contained" fullWidth size="large"
                    disabled={loading}
                    sx={{ mt: 1, borderRadius: 3, py: 1.5 }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar Solicitud'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          Powered by PAS Alert — Sistema de Gestión para Productores de Seguros
        </Typography>
      </Box>
    </Box>
  );
};
