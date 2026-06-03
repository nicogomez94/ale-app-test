import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, CircularProgress, Select, MenuItem,
  FormControl, InputLabel, Tooltip, Divider, Alert, Snackbar,
  ToggleButtonGroup, ToggleButton, FormControlLabel, Checkbox
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Plus, Search, Edit2, Trash2, Download, Car, Home, Package,
  Link2, QrCode, Copy, Check, MessageCircle, Mail
} from 'lucide-react';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import { api } from '../api';
import { DEBUG, debugData } from '../data/debugData';

// ─── Types ────────────────────────────────────────────────────────────────────
type CotizacionTipo = 'AUTO' | 'MOTO' | 'HOGAR' | 'OTROS';
type CotizacionOrigen = 'MANUAL' | 'LINK_PUBLICO';

interface Cotizacion {
  id: string;
  tipo: CotizacionTipo;
  origen: CotizacionOrigen;
  nombre: string;
  apellido?: string;
  cuitCuil?: string;
  email?: string;
  celular?: string;
  localidad?: string;
  provincia?: string;
  patente?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  tieneGnc?: boolean;
  tieneGps?: boolean;
  tipoVivienda?: string;
  superficieCubierta?: number;
  descripcionRiesgo?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPO_CONFIG: Record<CotizacionTipo, { label: string; icon: React.ReactNode; color: string }> = {
  AUTO:  { label: 'Auto',  icon: <Car size={16} />,     color: '#3b82f6' },
  MOTO:  { label: 'Moto',  icon: <TwoWheelerIcon sx={{ fontSize: 16 }} />, color: '#8b5cf6' },
  HOGAR: { label: 'Hogar', icon: <Home size={16} />,    color: '#f59e0b' },
  OTROS: { label: 'Otros', icon: <Package size={16} />, color: '#6b7280' },
};

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const EMPTY_FORM = {
  tipo: 'AUTO' as CotizacionTipo,
  nombre: '', apellido: '', cuitCuil: '', fechaNacimiento: '',
  email: '', celular: '',
  calle: '', cp: '', localidad: '', provincia: '',
  marca: '', modelo: '', anio: '', patente: '', tipoUso: 'Particular',
  tieneGnc: false, tieneGps: false, formaPago: '',
  tipoVivienda: 'Casa', superficieCubierta: '',
  descripcionRiesgo: '',
};

const buildCotizacionPayload = (form: typeof EMPTY_FORM) => {
  const isAutoMoto = form.tipo === 'AUTO' || form.tipo === 'MOTO';
  const isHogar = form.tipo === 'HOGAR';
  const isOtros = form.tipo === 'OTROS';

  return {
    ...form,
    marca: isAutoMoto ? form.marca : null,
    modelo: isAutoMoto ? form.modelo : null,
    anio: isAutoMoto ? form.anio : null,
    patente: isAutoMoto ? form.patente : null,
    tipoUso: isAutoMoto ? form.tipoUso : null,
    tieneGnc: isAutoMoto ? form.tieneGnc : null,
    tieneGps: isAutoMoto ? form.tieneGps : null,
    tipoVivienda: isHogar ? form.tipoVivienda : null,
    superficieCubierta: isHogar ? form.superficieCubierta : null,
    descripcionRiesgo: isOtros ? form.descripcionRiesgo : null,
  };
};

export const CotizacionesPage: React.FC = () => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingCot, setEditingCot] = useState<Cotizacion | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });

  // Share link
  const [linkOpen, setLinkOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkTipo, setLinkTipo] = useState<CotizacionTipo>('AUTO');

  const userId = (() => {
    try { return JSON.parse(atob(localStorage.getItem('pas_token')?.split('.')[1] ?? '')).userId ?? ''; }
    catch { return ''; }
  })();

  const publicBase = window.location.origin;
  const publicLink = `${publicBase}/cotizar/${userId}/${linkTipo.toLowerCase()}`;

  const loadData = useCallback(async () => {
    try {
      const data = await api.cotizaciones.list({ tipo: filterTipo, search });
      setCotizaciones(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, filterTipo]);

  useEffect(() => { loadData(); }, [loadData]);

  const setF = (key: keyof typeof EMPTY_FORM, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingCot(null);
    setForm(
      DEBUG
        ? { ...EMPTY_FORM, ...(debugData.cotizacion as Partial<typeof EMPTY_FORM>) }
        : { ...EMPTY_FORM }
    );
    setFormOpen(true);
  };

  const openEdit = (c: Cotizacion) => {
    setEditingCot(c);
    setForm({
      tipo: c.tipo,
      nombre: c.nombre,
      apellido: c.apellido ?? '',
      cuitCuil: c.cuitCuil ?? '',
      fechaNacimiento: '',
      email: c.email ?? '',
      celular: c.celular ?? '',
      calle: '', cp: '',
      localidad: c.localidad ?? '',
      provincia: c.provincia ?? '',
      marca: c.marca ?? '',
      modelo: c.modelo ?? '',
      anio: c.anio ? String(c.anio) : '',
      patente: c.patente ?? '',
      tipoUso: 'Particular',
      tieneGnc: c.tieneGnc ?? false,
      tieneGps: c.tieneGps ?? false,
      formaPago: '',
      tipoVivienda: c.tipoVivienda ?? 'Casa',
      superficieCubierta: c.superficieCubierta ? String(c.superficieCubierta) : '',
      descripcionRiesgo: c.descripcionRiesgo ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const payload = buildCotizacionPayload(form);
    try {
      if (editingCot) {
        await api.cotizaciones.update(editingCot.id, payload);
      } else {
        await api.cotizaciones.create(payload);
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    try { await api.cotizaciones.delete(id); loadData(); }
    catch (err: any) { alert(err.message); }
  };

  const handleExport = async () => {
    try {
      const blob = await api.cotizaciones.export({ tipo: filterTipo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Cotizaciones_PAS_Alert.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(err.message); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = (celular?: string) => {
    const phone = celular?.replace(/\D/g, '');
    if (!phone) return;
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleEmailClick = (email?: string) => {
    if (!email) return;
    window.open(`mailto:${email}`);
  };

  const isAutoMoto = form.tipo === 'AUTO' || form.tipo === 'MOTO';
  const isHogar = form.tipo === 'HOGAR';
  const isOtros = form.tipo === 'OTROS';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Cotizaciones</Typography>
          <Typography variant="body1" color="text.secondary">
            Gestioná solicitudes de cotización manuales y desde tu link público.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Link2 size={20} />} onClick={() => setLinkOpen(true)}>
            Compartir Link
          </Button>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>
            Exportar Excel
          </Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate} sx={{ borderRadius: 3 }}>
            Nueva Cotización
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" placeholder="Buscar por nombre, patente, email..."
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Seguro</InputLabel>
                <Select label="Tipo de Seguro" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {(search || filterTipo) && (
              <Grid item xs={12} md={2}>
                <Button size="small" onClick={() => { setSearch(''); setFilterTipo(''); }}>Limpiar</Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Tipo', 'Nombre', 'Datos del Riesgo', 'Contacto', 'Origen', 'Fecha', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {cotizaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No hay cotizaciones registradas
                </TableCell>
              </TableRow>
            ) : cotizaciones.map(c => {
              const tc = TIPO_CONFIG[c.tipo];
              const hasVehicleData = (c.tipo === 'AUTO' || c.tipo === 'MOTO') && (c.patente || c.marca || c.modelo || c.anio);
              const hasHomeData = c.tipo === 'HOGAR' && (c.tipoVivienda || c.superficieCubierta);
              const hasOtherData = c.tipo === 'OTROS' && c.descripcionRiesgo;
              return (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Chip
                      label={tc.label} size="small" icon={tc.icon as any}
                      sx={{ bgcolor: tc.color + '20', color: tc.color, fontWeight: 600, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{c.nombre} {c.apellido ?? ''}</Typography>
                    {c.cuitCuil && <Typography variant="caption" color="text.secondary">CUIT: {c.cuitCuil}</Typography>}
                  </TableCell>
                  <TableCell>
                    {hasVehicleData && (
                      <Typography variant="body2">
                        {[c.patente, [c.marca, c.modelo, c.anio].filter(Boolean).join(' ')].filter(Boolean).join(' — ')}
                      </Typography>
                    )}
                    {hasHomeData && <Typography variant="body2">{c.tipoVivienda}{c.superficieCubierta ? ` · ${c.superficieCubierta} m²` : ''}</Typography>}
                    {hasOtherData && <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{c.descripcionRiesgo}</Typography>}
                    {!hasVehicleData && !hasHomeData && !hasOtherData && '—'}
                  </TableCell>
                  <TableCell>
                    {c.email && <Typography variant="body2">{c.email}</Typography>}
                    {c.celular && <Typography variant="caption" color="text.secondary">{c.celular}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.origen === 'LINK_PUBLICO' ? 'Link público' : 'Manual'}
                      size="small"
                      color={c.origen === 'LINK_PUBLICO' ? 'info' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>
                    <Tooltip title={c.celular ? 'WhatsApp' : 'Sin celular'}>
                      <span>
                        <IconButton size="small" color="success" disabled={!c.celular} onClick={() => handleWhatsApp(c.celular)}>
                          <MessageCircle size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={c.email ? 'Email' : 'Sin email'}>
                      <span>
                        <IconButton size="small" color="info" disabled={!c.email} onClick={() => handleEmailClick(c.email)}>
                          <Mail size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(c)}><Edit2 size={16} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}><Trash2 size={16} /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Form Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCot ? 'Editar Cotización' : 'Nueva Cotización'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Tipo selector */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Tipo de Seguro</Typography>
              <ToggleButtonGroup
                exclusive value={form.tipo}
                onChange={(_, v) => v && setF('tipo', v)}
                size="small"
              >
                {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                  <ToggleButton key={k} value={k} sx={{ gap: 1 }}>
                    {v.icon} {v.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Datos Personales</Typography></Divider></Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Apellido" size="small" value={form.apellido} onChange={e => setF('apellido', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="CUIT/CUIL" size="small" value={form.cuitCuil} onChange={e => setF('cuitCuil', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Fecha de Nacimiento" type="date" size="small" value={form.fechaNacimiento} onChange={e => setF('fechaNacimiento', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" size="small" type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Celular" size="small" value={form.celular} onChange={e => setF('celular', e.target.value)} />
            </Grid>

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Dirección</Typography></Divider></Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Calle" size="small" value={form.calle} onChange={e => setF('calle', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth label="CP" size="small" value={form.cp} onChange={e => setF('cp', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Localidad" size="small" value={form.localidad} onChange={e => setF('localidad', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Provincia</InputLabel>
                <Select label="Provincia" value={form.provincia} onChange={e => setF('provincia', e.target.value)}>
                  {PROVINCIAS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Auto/Moto fields */}
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
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Checkbox checked={form.tieneGnc} onChange={e => setF('tieneGnc', e.target.checked)} />}
                    label="Tiene GNC"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Checkbox checked={form.tieneGps} onChange={e => setF('tieneGps', e.target.checked)} />}
                    label="Tiene GPS/Rastreador"
                  />
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

            {/* Hogar fields */}
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
                    fullWidth label="Superficie Cubierta (m²)" size="small" type="number"
                    value={form.superficieCubierta} onChange={e => setF('superficieCubierta', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {/* Otros fields */}
            {isOtros && (
              <>
                <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Descripción del Riesgo</Typography></Divider></Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Describí el bien o riesgo a asegurar"
                    size="small" multiline rows={3}
                    value={form.descripcionRiesgo} onChange={e => setF('descripcionRiesgo', e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingCot ? 'Guardar Cambios' : 'Crear Cotización'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Share Link Dialog ───────────────────────────────────────────────── */}
      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Link2 size={20} /> Compartir Link de Cotización
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Compartí este link con tus clientes para que puedan solicitar una cotización sin necesitar crear una cuenta.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Tipo de seguro pre-seleccionado:</Typography>
            <ToggleButtonGroup exclusive value={linkTipo} onChange={(_, v) => v && setLinkTipo(v)} size="small">
              {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                <ToggleButton key={k} value={k} sx={{ gap: 1 }}>{v.icon} {v.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Card sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                variant="body2" fontFamily="monospace"
                sx={{ flex: 1, wordBreak: 'break-all', color: 'primary.main' }}
              >
                {publicLink}
              </Typography>
              <Button
                size="small" variant="contained"
                startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                onClick={handleCopyLink}
                color={copied ? 'success' : 'primary'}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </Box>
          </Card>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <QrCode size={16} /> Código QR
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'inline-block' }}>
              <Box
                component="img"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicLink)}`}
                alt="QR Code"
                sx={{ display: 'block', width: 180, height: 180 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">Escaneá con el celular para abrir el formulario</Typography>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            También podés compartir <b>/cotizar/{'{'}userId{'}'}</b> para que el cliente elija el tipo.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
