import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Chip, CircularProgress, Select, MenuItem,
  Autocomplete, FormControl, InputLabel, Divider,
  LinearProgress
} from '@mui/material';
import {
  Plus, Search, Edit2, Download, AlertTriangle, CheckCircle, FileDown,
  XCircle, Clock, FileText, X, ChevronRight, Notebook, Mail, MessageCircle
} from 'lucide-react';
import { api, DashboardPolicy } from '../api';
import { DEBUG, debugData } from '../data/debugData';
import { ListingActions } from '../components/ListingActions';
import { printTableReport } from '../utils/reportExports';

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
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  fechaSiniestro: string;
  horaSiniestro?: string;
  lugarSiniestro?: string;
  descripcion: string;
  patente?: string;
  marcaModelo?: string;
  tipoDanio?: string;
  terceroNombre?: string;
  terceroMarcaModeloVehiculo?: string;
  terceroDanios?: string;
  terceroCelular?: string;
  terceroDireccion?: string;
  terceroDni?: string;
  terceroAseguradora?: string;
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
const inferClaimType = (rubro: string) => {
  const value = rubro.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (value.includes('moto')) return 'Moto';
  if (value.includes('auto') || value.includes('vehiculo')) return 'Automotor';
  if (value.includes('hogar')) return 'Hogar';
  if (value.includes('vida')) return 'Vida';
  if (value.includes('art')) return 'ART';
  if (value.includes('caucion')) return 'Caución';
  if (value.includes('consorcio')) return 'Consorcio';
  if (value.includes('comercio')) return 'Comercio';
  return 'Otros';
};

const fmt = (n?: number) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
    : '—';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('es-AR') : '—';

const EMPTY_FORM = {
  numeroSiniestro: '', numeroPoliza: '', aseguradora: '', tipoSeguro: 'Automotor',
  clienteNombre: '', clienteDni: '', clienteTelefono: '', clienteEmail: '', fechaSiniestro: '', horaSiniestro: '',
  lugarSiniestro: '', descripcion: '', patente: '', marcaModelo: '', tipoDanio: '',
  terceroNombre: '', terceroMarcaModeloVehiculo: '', terceroDanios: '', terceroCelular: '',
  terceroDireccion: '', terceroDni: '', terceroAseguradora: '',
  estado: 'DENUNCIADO' as SiniestroEstado, prioridad: 'BAJA' as SiniestroProioridad, responsable: '',
  importeReclamado: '', deducible: '', montoAprobado: '',
  ultimoContactoAseguradora: '', ultimoContactoCliente: '',
};

export const SiniestrosPage: React.FC = () => {
  const [siniestros, setSiniestros] = useState<Siniestro[]>([]);
  const [kpis, setKpis] = useState({ total: 0, activos: 0, enGestion: 0, criticos: 0, tiempoPromedioDias: 0, montoReclamadoTotal: 0, montoPagadoTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');
  const [policyOptions, setPolicyOptions] = useState<DashboardPolicy[]>([]);

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
  useEffect(() => {
    api.dashboard.policies().then((rows) => {
      const pending = rows.filter((policy) => !policy.pagada);
      const unique = new Map<string, DashboardPolicy>();
      (pending.length ? pending : rows).forEach((policy) => {
        if (!unique.has(policy.poliza)) unique.set(policy.poliza, policy);
      });
      setPolicyOptions(Array.from(unique.values()));
    }).catch(() => setPolicyOptions([]));
  }, []);

  // ─── Form handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingSiniestro(null);
    setForm(
      DEBUG
        ? { ...EMPTY_FORM, ...(debugData.siniestro as Partial<typeof EMPTY_FORM>) }
        : { ...EMPTY_FORM }
    );
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
      clienteTelefono: s.clienteTelefono ?? '',
      clienteEmail: s.clienteEmail ?? '',
      fechaSiniestro: s.fechaSiniestro ? s.fechaSiniestro.split('T')[0] : '',
      horaSiniestro: s.horaSiniestro ?? '',
      lugarSiniestro: s.lugarSiniestro ?? '',
      descripcion: s.descripcion,
      patente: s.patente ?? '',
      marcaModelo: s.marcaModelo ?? '',
      tipoDanio: s.tipoDanio ?? '',
      terceroNombre: s.terceroNombre ?? '',
      terceroMarcaModeloVehiculo: s.terceroMarcaModeloVehiculo ?? '',
      terceroDanios: s.terceroDanios ?? '',
      terceroCelular: s.terceroCelular ?? '',
      terceroDireccion: s.terceroDireccion ?? '',
      terceroDni: s.terceroDni ?? '',
      terceroAseguradora: s.terceroAseguradora ?? '',
      estado: s.estado,
      prioridad: s.prioridad,
      responsable: s.responsable ?? '',
      importeReclamado: s.importeReclamado !== undefined ? String(s.importeReclamado) : '',
      deducible: s.deducible !== undefined ? String(s.deducible) : '',
      montoAprobado: s.montoAprobado !== undefined ? String(s.montoAprobado) : '',
      ultimoContactoAseguradora: s.ultimoContactoAseguradora ? s.ultimoContactoAseguradora.split('T')[0] : '',
      ultimoContactoCliente: s.ultimoContactoCliente ? s.ultimoContactoCliente.split('T')[0] : '',
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

  const handleExportPdf = () => printTableReport('Centro de Siniestros', siniestros, [
    { label: 'Siniestro', value: (s) => s.numeroSiniestro }, { label: 'Cliente', value: (s) => s.clienteNombre }, { label: 'Póliza', value: (s) => s.numeroPoliza },
    { label: 'Tipo', value: (s) => s.tipoSeguro }, { label: 'Estado', value: (s) => estadoInfo(s.estado).label }, { label: 'Prioridad', value: (s) => s.prioridad }, { label: 'Reclamado', value: (s) => fmt(s.importeReclamado) },
  ]);

  const buildContactMessage = (s: Siniestro) =>
    `Hola ${s.clienteNombre}, te contactamos por el siniestro N° ${s.numeroSiniestro} de tu póliza ${s.numeroPoliza} con ${s.aseguradora}. Queríamos darte seguimiento al estado del reclamo: ${estadoInfo(s.estado).label}. Saludos, PAS Alert.`;

  const handleWhatsApp = (s: Siniestro) => {
    const phone = s.clienteTelefono?.replace(/\D/g, '');
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildContactMessage(s))}`, '_blank');
  };

  const handleEmailClick = (s: Siniestro) => {
    if (!s.clienteEmail) return;
    const subject = `Seguimiento de siniestro ${s.numeroSiniestro}`;
    window.open(`mailto:${s.clienteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildContactMessage(s))}`);
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
      const found = (await api.siniestros.list({})).find((s: Siniestro) => s.id === selectedSiniestro.id);
      if (found) setSelectedSiniestro(found);
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setSavingNota(false); }
  };

  const setF = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const applyPolicy = (policy: DashboardPolicy | null) => {
    if (!policy) return;
    setForm((prev) => ({
      ...prev,
      numeroPoliza: policy.poliza,
      aseguradora: policy.aseguradora,
      tipoSeguro: inferClaimType(policy.rubro || ''),
      clienteNombre: policy.clienteNombre || policy.cliente,
      clienteDni: policy.clienteDni || '',
      clienteTelefono: policy.telefono || '',
      clienteEmail: policy.email || '',
      patente: policy.patente || prev.patente,
    }));
  };

  const isAutoMoto = form.tipoSeguro === 'Automotor' || form.tipoSeguro === 'Moto';
  const isHogar = form.tipoSeguro === 'Hogar';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        mb: 4,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-start' },
        gap: 2,
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>Centro de Siniestros</Typography>
          <Typography variant="body1" color="text.secondary">
            Gestión inteligente, seguimiento activo y control de tiempos.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>
            Exportar
          </Button>
          <Button variant="outlined" color="error" startIcon={<FileDown size={20} />} onClick={handleExportPdf}>Exportar PDF</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate} sx={{ borderRadius: 3 }}>
            Nuevo Siniestro
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Siniestros Activos', value: kpis.activos, icon: <FileText size={24} />, color: '#4f8ee8' },
          { label: 'En Gestión', value: kpis.enGestion, icon: <Clock size={24} />, color: '#e9ad25' },
          { label: 'Siniestros Críticos', value: kpis.criticos, icon: <AlertTriangle size={24} />, color: '#ef5260' },
          { label: 'Tiempo Promedio', value: `${kpis.tiempoPromedioDias} días`, icon: <Clock size={24} />, color: '#8e66db' },
        ].map(kpi => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.label}>
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
        <CardContent
          sx={{
            p: 3,
            '&:last-child': { pb: 3 },
            '& .MuiOutlinedInput-root': { borderRadius: 2 },
            '& .MuiInputLabel-root.MuiInputLabel-shrink': { bgcolor: 'background.paper', px: 0.5 },
            '& .MuiSelect-select': { display: 'flex', alignItems: 'center', minHeight: 24 },
          }}
        >
          <Grid container spacing={2.5} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth size="small" placeholder="Buscar por N° siniestro, cliente, aseguradora..."
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>Estado</InputLabel>
                <Select label="Estado" notched value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                  <MenuItem value="">Todos</MenuItem>
                  {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>Prioridad</InputLabel>
                <Select label="Prioridad" notched value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)}>
                  <MenuItem value="">Todas</MenuItem>
                  {PRIORIDADES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
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
      <TableContainer component={Paper} sx={{ borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['N° Siniestro', 'Cliente', 'Aseguradora', 'Tipo', 'Fecha', 'Estado', 'Prioridad', 'Importe Reclamado', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700, textAlign: h === 'Acciones' ? 'right' : 'left', minWidth: h === 'Acciones' ? 220 : undefined }}>{h}</TableCell>
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
                <TableRow key={s.id} hover sx={{ cursor: 'pointer', borderLeft: `6px solid ${est.color}`, '& > td': { bgcolor: `${est.color}0d` }, '&:hover > td': { bgcolor: `${est.color}18` } }}>
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
                  <TableCell sx={{ textAlign: 'right', minWidth: 220 }}>
                    <ListingActions
                      onView={() => openDetail(s)}
                      onWhatsApp={() => handleWhatsApp(s)}
                      onEmail={() => handleEmailClick(s)}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s.id)}
                      disableWhatsApp={!s.clienteTelefono}
                      disableEmail={!s.clienteEmail}
                      whatsappTitle={s.clienteTelefono ? '' : 'Sin teléfono'}
                      emailTitle={s.clienteEmail ? '' : 'Sin email'}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Form Dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingSiniestro ? 'Editar Siniestro' : 'Nuevo Siniestro'}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: 3,
            '& .MuiOutlinedInput-root': { borderRadius: 2 },
            '& .MuiInputLabel-root': { fontWeight: 600 },
            '& .MuiInputLabel-root.MuiInputLabel-shrink': { bgcolor: 'background.paper', px: 0.5 },
            '& .MuiSelect-select': { display: 'flex', alignItems: 'center', minHeight: 24 },
          }}
        >
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="N° Siniestro *" size="small" value={form.numeroSiniestro} onChange={e => setF('numeroSiniestro', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                freeSolo
                options={policyOptions}
                value={policyOptions.find((policy) => policy.poliza === form.numeroPoliza) || form.numeroPoliza}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.poliza} · ${option.cliente}`}
                onChange={(_, value) => typeof value === 'string' ? setF('numeroPoliza', value) : applyPolicy(value)}
                onInputChange={(_, value, reason) => { if (reason === 'input') setF('numeroPoliza', value.split(' · ')[0]); }}
                renderInput={(params) => <TextField {...params} fullWidth label="N° Póliza *" size="small" helperText="Al elegir una póliza se completan automáticamente los datos del titular." />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Aseguradora *" size="small" value={form.aseguradora} onChange={e => setF('aseguradora', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>Tipo de Seguro *</InputLabel>
                <Select label="Tipo de Seguro *" notched value={form.tipoSeguro} onChange={e => setF('tipoSeguro', e.target.value)}>
                  {['Automotor', 'Moto', 'Hogar', 'Vida', 'ART', 'Caución', 'Consorcio', 'Comercio', 'Otros'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Nombre del Cliente *" size="small" value={form.clienteNombre} onChange={e => setF('clienteNombre', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="DNI del Cliente" size="small" value={form.clienteDni} onChange={e => setF('clienteDni', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Celular del Cliente" size="small" value={form.clienteTelefono} onChange={e => setF('clienteTelefono', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Email del Cliente" size="small" type="email" value={form.clienteEmail} onChange={e => setF('clienteEmail', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Fecha del Siniestro *" type="date" size="small" value={form.fechaSiniestro} onChange={e => setF('fechaSiniestro', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Hora" type="time" size="small" value={form.horaSiniestro} onChange={e => setF('horaSiniestro', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Lugar" size="small" value={form.lugarSiniestro} onChange={e => setF('lugarSiniestro', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Descripción del hecho *" size="small" multiline rows={3} value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
            </Grid>

            {/* Dynamic fields: Automotor/Moto */}
            {isAutoMoto && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Patente" size="small" value={form.patente} onChange={e => setF('patente', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Marca / Modelo" size="small" value={form.marcaModelo} onChange={e => setF('marcaModelo', e.target.value)} />
                </Grid>
              </>
            )}

            {/* Dynamic fields: Hogar */}
            {isHogar && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Tipo de daño" size="small" value={form.tipoDanio} onChange={e => setF('tipoDanio', e.target.value)} />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Datos del tercero</Typography></Divider></Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Nombre y apellido" size="small" value={form.terceroNombre} onChange={e => setF('terceroNombre', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="DNI" size="small" value={form.terceroDni} onChange={e => setF('terceroDni', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Marca y modelo del vehiculo" size="small" value={form.terceroMarcaModeloVehiculo} onChange={e => setF('terceroMarcaModeloVehiculo', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Aseguradora del tercero" size="small" value={form.terceroAseguradora} onChange={e => setF('terceroAseguradora', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Celular del tercero" size="small" value={form.terceroCelular} onChange={e => setF('terceroCelular', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Direccion del tercero" size="small" value={form.terceroDireccion} onChange={e => setF('terceroDireccion', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Daños del tercero" size="small" multiline rows={2} value={form.terceroDanios} onChange={e => setF('terceroDanios', e.target.value)} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>Estado</InputLabel>
                <Select label="Estado" notched value={form.estado} onChange={e => setF('estado', e.target.value as SiniestroEstado)}>
                  {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>Prioridad</InputLabel>
                <Select label="Prioridad" notched value={form.prioridad} onChange={e => setF('prioridad', e.target.value as SiniestroProioridad)}>
                  {PRIORIDADES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Responsable" size="small" value={form.responsable} onChange={e => setF('responsable', e.target.value)} />
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Montos</Typography></Divider></Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Importe Reclamado" size="small" type="number" value={form.importeReclamado} onChange={e => setF('importeReclamado', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Deducible" size="small" type="number" value={form.deducible} onChange={e => setF('deducible', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Monto Aprobado" size="small" type="number" value={form.montoAprobado} onChange={e => setF('montoAprobado', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Últimos contactos</Typography></Divider></Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Último contacto aseguradora"
                type="date"
                size="small"
                value={form.ultimoContactoAseguradora}
                onChange={e => setF('ultimoContactoAseguradora', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Último contacto cliente"
                type="date"
                size="small"
                value={form.ultimoContactoCliente}
                onChange={e => setF('ultimoContactoCliente', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
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

      {/* ─── Detail Modal ────────────────────────────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { width: 'min(1180px, 96vw)', maxHeight: '92vh', p: { xs: 2, md: 3 }, borderRadius: 4, overflowY: 'auto' } }}
      >
        {selectedSiniestro && (() => {
          const s = selectedSiniestro;
          const est = estadoInfo(s.estado);
          const pri = PRIORIDADES.find(p => p.value === s.prioridad) ?? PRIORIDADES[2];
          return (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ width: 58, height: 58, borderRadius: '50%', bgcolor: '#eef5ff', color: '#4f8ee8', display: 'grid', placeItems: 'center' }}><AlertTriangle size={25} /></Box>
                  <Box>
                  <Typography variant="h6" fontWeight={700}>{s.numeroSiniestro}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.clienteNombre}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}><Button size="small" color="success" variant="outlined" startIcon={<MessageCircle size={15} />} disabled={!s.clienteTelefono} onClick={() => handleWhatsApp(s)}>WhatsApp</Button><Button size="small" variant="outlined" startIcon={<Mail size={15} />} disabled={!s.clienteEmail} onClick={() => handleEmailClick(s)}>Email</Button></Box>
                  </Box>
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
                  { label: 'Celular Cliente', value: s.clienteTelefono ?? '—' },
                  { label: 'Email Cliente', value: s.clienteEmail ?? '—' },
                  { label: 'Responsable', value: s.responsable ?? '—' },
                  ...(s.patente ? [{ label: 'Patente', value: s.patente }] : []),
                  ...(s.marcaModelo ? [{ label: 'Vehículo', value: s.marcaModelo }] : []),
                  ...(s.tipoDanio ? [{ label: 'Tipo de daño', value: s.tipoDanio }] : []),
                ].map(({ label, value }) => (
                  <Grid size={{ xs: 6 }} key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={500}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <b>Descripción:</b> {s.descripcion}
              </Typography>

              {(s.terceroNombre || s.terceroMarcaModeloVehiculo || s.terceroDanios || s.terceroCelular || s.terceroDireccion || s.terceroDni || s.terceroAseguradora) && (
                <Card sx={{ bgcolor: '#f8fafc', mb: 3, borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Datos del tercero</Typography>
                    <Grid container spacing={1}>
                      {[
                        { label: 'Nombre', value: s.terceroNombre },
                        { label: 'DNI', value: s.terceroDni },
                        { label: 'Vehículo', value: s.terceroMarcaModeloVehiculo },
                        { label: 'Aseguradora', value: s.terceroAseguradora },
                        { label: 'Celular', value: s.terceroCelular },
                        { label: 'Dirección', value: s.terceroDireccion },
                      ].map(({ label, value }) => (
                        <Grid size={{ xs: 6 }} key={label}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
                        </Grid>
                      ))}
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">Daños</Typography>
                        <Typography variant="body2" fontWeight={500}>{s.terceroDanios || '—'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Montos */}
              <Card sx={{ bgcolor: '#f8fafc', mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary">Reclamado</Typography>
                      <Typography variant="body2" fontWeight={700} color="error.main">{fmt(s.importeReclamado)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary">Deducible</Typography>
                      <Typography variant="body2" fontWeight={600}>{fmt(s.deducible)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
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
      </Dialog>
    </Box>
  );
};
