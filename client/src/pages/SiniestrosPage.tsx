import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Chip, CircularProgress, Select, MenuItem,
  FormControl, InputLabel, Drawer, Divider, Badge, Tooltip,
  LinearProgress, Stack
} from '@mui/material';
import {
  Plus, Search, Edit2, Trash2, Download, AlertTriangle, CheckCircle,
  XCircle, Clock, FileText, MessageCircle, X, ChevronRight, Notebook
} from 'lucide-react';
import { api } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────
type SiniestroEstado =
  | 'DENUNCIADO' | 'EN_GESTION' | 'EN_INSPECCION'
  | 'EN_ANALISIS' | 'APROBADO' | 'RECHAZADO' | 'PAGADO';
type SiniestroProioridad = 'ALTA' | 'MEDIA' | 'BAJA';

interface Siniestro {
  id: string;
  numeroSiniestro: string;
  numeroPoliza: string;
  aseguradora: string;
  tipoSeguro: string;
  clienteNombre: string;
  clienteDni?: string;
  fechaSiniestro: string;
  horaSiniestro?: string;
  lugarSiniestro?: string;
  descripcion: string;
  patente?: string;
  marcaModelo?: string;
  tipoDanio?: string;
  estado: SiniestroEstado;
  prioridad: SiniestroProioridad;
  responsable?: string;
  importeReclamado?: number;
  deducible?: number;
  montoAprobado?: number;
  ultimoContactoAseguradora?: string;
  ultimoContactoCliente?: string;
  notas: { id: string; texto: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ESTADOS: { value: SiniestroEstado; label: string; color: string }[] = [
  { value: 'DENUNCIADO',    label: 'Denunciado',    color: '#3b82f6' },
  { value: 'EN_GESTION',   label: 'En gestión',    color: '#f59e0b' },
  { value: 'EN_INSPECCION', label: 'En inspección', color: '#8b5cf6' },
  { value: 'EN_ANALISIS',  label: 'En análisis',   color: '#6366f1' },
  { value: 'APROBADO',     label: 'Aprobado',      color: '#10b981' },
  { value: 'RECHAZADO',    label: 'Rechazado',     color: '#ef4444' },
  { value: 'PAGADO',       label: 'Pagado',        color: '#065f46' },
];

const PRIORIDADES: { value: SiniestroProioridad; label: string; color: 'error' | 'warning' | 'default' }[] = [
  { value: 'ALTA',  label: 'Alta',  color: 'error' },
  { value: 'MEDIA', label: 'Media', color: 'warning' },
  { value: 'BAJA',  label: 'Baja',  color: 'default' },
];

const ESTADO_PROGRESS: Record<SiniestroEstado, number> = {
  DENUNCIADO: 10, EN_GESTION: 30, EN_INSPECCION: 50,
  EN_ANALISIS: 65, APROBADO: 85, RECHAZADO: 100, PAGADO: 100,
};

const estadoInfo = (e: SiniestroEstado) => ESTADOS.find(s => s.value === e) ?? ESTADOS[0];

const fmt = (n?: number) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
    : '—';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('es-AR') : '—';

const EMPTY_FORM = {
  numeroSiniestro: '', numeroPoliza: '', aseguradora: '', tipoSeguro: 'Automotor',
  clienteNombre: '', clienteDni: '', fechaSiniestro: '', horaSiniestro: '',
  lugarSiniestro: '', descripcion: '', patente: '', marcaModelo: '', tipoDanio: '',
  estado: 'DENUNCIADO' as SiniestroEstado, responsable: '',
  importeReclamado: '', deducible: '', montoAprobado: '',
};

export const SiniestrosPage: React.FC = () => {
  const [siniestros, setSiniestros] = useState<Siniestro[]>([]);
  const [kpis, setKpis] = useState({ total: 0, activos: 0, montoReclamadoTotal: 0, montoPagadoTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSiniestro, setEditingSiniestro] = useState<Siniestro | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSiniestro, setSelectedSiniestro] = useState<Siniestro | null>(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [savingNota, setSavingNota] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const params: any = {};
      if (filterEstado) params.estado = filterEstado;
      if (filterPrioridad) params.prioridad = filterPrioridad;
      if (search) params.search = search;
      const [data, kpiData] = await Promise.all([
        api.siniestros.list(params),
        api.siniestros.kpis(),
      ]);
      setSiniestros(data);
      setKpis(kpiData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, filterEstado, filterPrioridad]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Form handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingSiniestro(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEdit = (s: Siniestro) => {
    setEditingSiniestro(s);
    setForm({
      numeroSiniestro: s.numeroSiniestro,
      numeroPoliza: s.numeroPoliza,
      aseguradora: s.aseguradora,
      tipoSeguro: s.tipoSeguro,
      clienteNombre: s.clienteNombre,
      clienteDni: s.clienteDni ?? '',
      fechaSiniestro: s.fechaSiniestro ? s.fechaSiniestro.split('T')[0] : '',
      horaSiniestro: s.horaSiniestro ?? '',
      lugarSiniestro: s.lugarSiniestro ?? '',
      descripcion: s.descripcion,
      patente: s.patente ?? '',
      marcaModelo: s.marcaModelo ?? '',
      tipoDanio: s.tipoDanio ?? '',
      estado: s.estado,
      responsable: s.responsable ?? '',
      importeReclamado: s.importeReclamado !== undefined ? String(s.importeReclamado) : '',
      deducible: s.deducible !== undefined ? String(s.deducible) : '',
      montoAprobado: s.montoAprobado !== undefined ? String(s.montoAprobado) : '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const payload: any = {
      ...form,
      importeReclamado: form.importeReclamado ? parseFloat(form.importeReclamado) : null,
      deducible: form.deducible ? parseFloat(form.deducible) : null,
      montoAprobado: form.montoAprobado ? parseFloat(form.montoAprobado) : null,
    };
    try {
      if (editingSiniestro) {
        await api.siniestros.update(editingSiniestro.id, payload);
      } else {
        await api.siniestros.create(payload);
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este siniestro?')) return;
    try { await api.siniestros.delete(id); loadData(); }
    catch (err: any) { alert(err.message); }
  };

  const handleExport = async () => {
    try {
      const blob = await api.siniestros.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Siniestros_PAS_Alert.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(err.message); }
  };

  const openDetail = (s: Siniestro) => {
    setSelectedSiniestro(s);
    setDetailOpen(true);
  };

  const handleAddNota = async () => {
    if (!selectedSiniestro || !nuevaNota.trim()) return;
    setSavingNota(true);
    try {
      await api.siniestros.addNota(selectedSiniestro.id, nuevaNota.trim());
      setNuevaNota('');
      // Refresh detail
      const updated = await api.siniestros.list({ search: selectedSiniestro.id });
      const found = (await api.siniestros.list({})).find((s: Siniestro) => s.id === selectedSiniestro.id);
      if (found) setSelectedSiniestro(found);
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setSavingNota(false); }
  };

  const setF = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const isAutoMoto = form.tipoSeguro === 'Automotor' || form.tipoSeguro === 'Moto';
  const isHogar = form.tipoSeguro === 'Hogar';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Módulo de Siniestros</Typography>
          <Typography variant="body1" color="text.secondary">
            Registrá, seguí y cerrá todos los reclamos de tus clientes.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>
            Exportar Excel
          </Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate} sx={{ borderRadius: 3 }}>
            Nuevo Siniestro
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Siniestros', value: kpis.total, icon: <FileText size={24} />, color: '#6366f1' },
          { label: 'Siniestros Activos', value: kpis.activos, icon: <Clock size={24} />, color: '#f59e0b' },
          { label: 'Monto Reclamado', value: fmt(kpis.montoReclamadoTotal), icon: <AlertTriangle size={24} />, color: '#ef4444' },
          { label: 'Monto Pagado', value: fmt(kpis.montoPagadoTotal), icon: <CheckCircle size={24} />, color: '#10b981' },
        ].map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{kpi.label}</Typography>
                    <Typography variant="h5" fontWeight={700}>{kpi.value}</Typography>
                  </Box>
                  <Box sx={{ color: kpi.color, opacity: 0.8 }}>{kpi.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth size="small" placeholder="Buscar por N° siniestro, cliente, aseguradora..."
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                  <MenuItem value="">Todos</MenuItem>
                  {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Prioridad</InputLabel>
                <Select label="Prioridad" value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)}>
                  <MenuItem value="">Todas</MenuItem>
                  {PRIORIDADES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              {(search || filterEstado || filterPrioridad) && (
                <Button size="small" onClick={() => { setSearch(''); setFilterEstado(''); setFilterPrioridad(''); }}>
                  Limpiar
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['N° Siniestro', 'Cliente', 'Aseguradora', 'Tipo', 'Fecha', 'Estado', 'Prioridad', 'Importe Reclamado', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {siniestros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No hay siniestros registrados
                </TableCell>
              </TableRow>
            ) : siniestros.map(s => {
              const est = estadoInfo(s.estado);
              const pri = PRIORIDADES.find(p => p.value === s.prioridad) ?? PRIORIDADES[2];
              return (
                <TableRow key={s.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 700 }} onClick={() => openDetail(s)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {s.numeroSiniestro}
                      <ChevronRight size={16} color="#9ca3af" />
                    </Box>
                  </TableCell>
                  <TableCell onClick={() => openDetail(s)}>
                    <Typography variant="body2" fontWeight={600}>{s.clienteNombre}</Typography>
                    {s.clienteDni && <Typography variant="caption" color="text.secondary">DNI {s.clienteDni}</Typography>}
                  </TableCell>
                  <TableCell onClick={() => openDetail(s)}>{s.aseguradora}</TableCell>
                  <TableCell onClick={() => openDetail(s)}>{s.tipoSeguro}</TableCell>
                  <TableCell onClick={() => openDetail(s)}>{fmtDate(s.fechaSiniestro)}</TableCell>
                  <TableCell onClick={() => openDetail(s)}>
                    <Chip
                      label={est.label} size="small"
                      sx={{ bgcolor: est.color + '20', color: est.color, fontWeight: 600, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell onClick={() => openDetail(s)}>
                    <Chip label={pri.label} size="small" color={pri.color} />
                  </TableCell>
                  <TableCell onClick={() => openDetail(s)}>{fmt(s.importeReclamado)}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(s)}><Edit2 size={16} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Form Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingSiniestro ? 'Editar Siniestro' : 'Nuevo Siniestro'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="N° Siniestro *" size="small" value={form.numeroSiniestro} onChange={e => setF('numeroSiniestro', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="N° Póliza *" size="small" value={form.numeroPoliza} onChange={e => setF('numeroPoliza', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Aseguradora *" size="small" value={form.aseguradora} onChange={e => setF('aseguradora', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Seguro *</InputLabel>
                <Select label="Tipo de Seguro *" value={form.tipoSeguro} onChange={e => setF('tipoSeguro', e.target.value)}>
                  {['Automotor', 'Moto', 'Hogar', 'Vida', 'ART', 'Caución', 'Consorcio', 'Comercio', 'Otros'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nombre del Cliente *" size="small" value={form.clienteNombre} onChange={e => setF('clienteNombre', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="DNI del Cliente" size="small" value={form.clienteDni} onChange={e => setF('clienteDni', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Fecha del Siniestro *" type="date" size="small" value={form.fechaSiniestro} onChange={e => setF('fechaSiniestro', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Hora" type="time" size="small" value={form.horaSiniestro} onChange={e => setF('horaSiniestro', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Lugar" size="small" value={form.lugarSiniestro} onChange={e => setF('lugarSiniestro', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Descripción del hecho *" size="small" multiline rows={3} value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
            </Grid>

            {/* Dynamic fields: Automotor/Moto */}
            {isAutoMoto && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Patente" size="small" value={form.patente} onChange={e => setF('patente', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Marca / Modelo" size="small" value={form.marcaModelo} onChange={e => setF('marcaModelo', e.target.value)} />
                </Grid>
              </>
            )}

            {/* Dynamic fields: Hogar */}
            {isHogar && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Tipo de daño" size="small" value={form.tipoDanio} onChange={e => setF('tipoDanio', e.target.value)} />
              </Grid>
            )}

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.estado} onChange={e => setF('estado', e.target.value as SiniestroEstado)}>
                  {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Responsable" size="small" value={form.responsable} onChange={e => setF('responsable', e.target.value)} />
            </Grid>

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Montos</Typography></Divider></Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Importe Reclamado" size="small" type="number" value={form.importeReclamado} onChange={e => setF('importeReclamado', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Deducible" size="small" type="number" value={form.deducible} onChange={e => setF('deducible', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Monto Aprobado" size="small" type="number" value={form.montoAprobado} onChange={e => setF('montoAprobado', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingSiniestro ? 'Guardar Cambios' : 'Crear Siniestro'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Detail Drawer ───────────────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}
      >
        {selectedSiniestro && (() => {
          const s = selectedSiniestro;
          const est = estadoInfo(s.estado);
          const pri = PRIORIDADES.find(p => p.value === s.prioridad) ?? PRIORIDADES[2];
          return (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>{s.numeroSiniestro}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.clienteNombre}</Typography>
                </Box>
                <IconButton onClick={() => setDetailOpen(false)}><X size={20} /></IconButton>
              </Box>

              {/* Progress */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Chip label={est.label} size="small" sx={{ bgcolor: est.color + '20', color: est.color, fontWeight: 600 }} />
                  <Chip label={`Prioridad: ${pri.label}`} size="small" color={pri.color} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={ESTADO_PROGRESS[s.estado]}
                  sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9',
                    '& .MuiLinearProgress-bar': { bgcolor: s.estado === 'RECHAZADO' ? '#ef4444' : est.color }
                  }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Details */}
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {[
                  { label: 'Póliza', value: s.numeroPoliza },
                  { label: 'Aseguradora', value: s.aseguradora },
                  { label: 'Tipo de Seguro', value: s.tipoSeguro },
                  { label: 'Fecha del Siniestro', value: fmtDate(s.fechaSiniestro) },
                  { label: 'Hora', value: s.horaSiniestro ?? '—' },
                  { label: 'Lugar', value: s.lugarSiniestro ?? '—' },
                  { label: 'DNI', value: s.clienteDni ?? '—' },
                  { label: 'Responsable', value: s.responsable ?? '—' },
                  ...(s.patente ? [{ label: 'Patente', value: s.patente }] : []),
                  ...(s.marcaModelo ? [{ label: 'Vehículo', value: s.marcaModelo }] : []),
                  ...(s.tipoDanio ? [{ label: 'Tipo de daño', value: s.tipoDanio }] : []),
                ].map(({ label, value }) => (
                  <Grid item xs={6} key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={500}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <b>Descripción:</b> {s.descripcion}
              </Typography>

              {/* Montos */}
              <Card sx={{ bgcolor: '#f8fafc', mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Reclamado</Typography>
                      <Typography variant="body2" fontWeight={700} color="error.main">{fmt(s.importeReclamado)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Deducible</Typography>
                      <Typography variant="body2" fontWeight={600}>{fmt(s.deducible)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Aprobado</Typography>
                      <Typography variant="body2" fontWeight={700} color="success.main">{fmt(s.montoAprobado)}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Último contacto */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Último contacto Aseguradora</Typography>
                  <Typography variant="body2">{fmtDate(s.ultimoContactoAseguradora)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Último contacto Cliente</Typography>
                  <Typography variant="body2">{fmtDate(s.ultimoContactoCliente)}</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Notas */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Notebook size={18} />
                <Typography variant="subtitle2" fontWeight={700}>Historial de Notas</Typography>
              </Box>

              <Box sx={{ maxHeight: 180, overflowY: 'auto', mb: 2 }}>
                {s.notas.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin notas aún.</Typography>
                ) : s.notas.map(n => (
                  <Box key={n.id} sx={{ mb: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                    <Typography variant="body2">{n.texto}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(n.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth size="small" placeholder="Añadir nota..."
                  value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNota(); }}}
                />
                <Button variant="contained" size="small" onClick={handleAddNota} disabled={savingNota || !nuevaNota.trim()}>
                  Agregar
                </Button>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button fullWidth variant="outlined" onClick={() => { openEdit(s); setDetailOpen(false); }} startIcon={<Edit2 size={16} />}>
                  Editar
                </Button>
              </Box>
            </>
          );
        })()}
      </Drawer>
    </Box>
  );
};
