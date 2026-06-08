import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../api';

const BROKER_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#be123c', '#4b5563'];
const IVA_CONDITIONS = ['Responsable Inscripto', 'Monotributo', 'Consumidor Final', 'Exento'];

const emptyInsurer = {
  razonSocial: '',
  cuit: '',
  domicilioComercial: '',
  ivaCondition: '',
  email: '',
  telefono: '',
  websiteUrl: '',
  portalUsername: '',
  portalPassword: '',
  clearPortalPassword: false,
  producerCode: '',
  notes: '',
  brokerIds: [] as string[],
};

const emptyBroker = {
  nombre: '',
  color: BROKER_COLORS[0],
  contactoNombre: '',
  email: '',
  insurerIds: [] as string[],
};

const formatMoney = (value: number, currency: string) =>
  `${currency} ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

export const DirectoryPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [insurers, setInsurers] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsurer, setExpandedInsurer] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [insurerDialogOpen, setInsurerDialogOpen] = useState(false);
  const [brokerDialogOpen, setBrokerDialogOpen] = useState(false);
  const [editingInsurer, setEditingInsurer] = useState<any>(null);
  const [editingBroker, setEditingBroker] = useState<any>(null);
  const [insurerForm, setInsurerForm] = useState(emptyInsurer);
  const [brokerForm, setBrokerForm] = useState(emptyBroker);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [insurerData, brokerData] = await Promise.all([
        api.directory.insurers.list(tab === 0 ? searchTerm : undefined),
        api.directory.brokers.list(tab === 1 ? searchTerm : undefined),
      ]);
      setInsurers(insurerData);
      setBrokers(brokerData);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo cargar el directorio.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tab, searchTerm]);

  const stats = useMemo(() => ({
    insurers: insurers.length,
    brokers: brokers.length,
    ars: insurers.reduce((sum, insurer) => sum + Number(insurer.totalFacturadoARS || 0), 0),
    usd: insurers.reduce((sum, insurer) => sum + Number(insurer.totalFacturadoUSD || 0), 0),
  }), [insurers, brokers]);

  const openInsurerDialog = (insurer?: any) => {
    setEditingInsurer(insurer || null);
    setInsurerForm(insurer
      ? {
          razonSocial: insurer.razonSocial || '',
          cuit: insurer.cuit || '',
          domicilioComercial: insurer.domicilioComercial || '',
          ivaCondition: insurer.ivaCondition || '',
          email: insurer.email || '',
          telefono: insurer.telefono || '',
          websiteUrl: insurer.websiteUrl || '',
          portalUsername: insurer.portalUsername || '',
          portalPassword: '',
          clearPortalPassword: false,
          producerCode: insurer.producerCode || '',
          notes: insurer.notes || '',
          brokerIds: (insurer.brokers || []).map((broker: any) => broker.id),
        }
      : { ...emptyInsurer });
    setInsurerDialogOpen(true);
  };

  const openBrokerDialog = (broker?: any) => {
    setEditingBroker(broker || null);
    setBrokerForm(broker
      ? {
          nombre: broker.nombre || '',
          color: broker.color || BROKER_COLORS[0],
          contactoNombre: broker.contactoNombre || '',
          email: broker.email || '',
          insurerIds: (broker.insurers || []).map((insurer: any) => insurer.id),
        }
      : { ...emptyBroker });
    setBrokerDialogOpen(true);
  };

  const saveInsurer = async () => {
    setSaving(true);
    try {
      if (editingInsurer) {
        await api.directory.insurers.update(editingInsurer.id, insurerForm);
      } else {
        await api.directory.insurers.create(insurerForm);
      }
      setInsurerDialogOpen(false);
      setSnack({ open: true, message: 'Aseguradora guardada.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo guardar la aseguradora.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveBroker = async () => {
    setSaving(true);
    try {
      if (editingBroker) {
        await api.directory.brokers.update(editingBroker.id, brokerForm);
      } else {
        await api.directory.brokers.create(brokerForm);
      }
      setBrokerDialogOpen(false);
      setSnack({ open: true, message: 'Broker guardado.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo guardar el broker.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteInsurer = async (insurer: any) => {
    if (!window.confirm(`Eliminar aseguradora ${insurer.razonSocial}?`)) return;
    try {
      await api.directory.insurers.delete(insurer.id);
      setSnack({ open: true, message: 'Aseguradora eliminada.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo eliminar la aseguradora.', severity: 'error' });
    }
  };

  const deleteBroker = async (broker: any) => {
    if (!window.confirm(`Eliminar broker ${broker.nombre}?`)) return;
    try {
      await api.directory.brokers.delete(broker.id);
      setSnack({ open: true, message: 'Broker eliminado.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo eliminar el broker.', severity: 'error' });
    }
  };

  const revealPassword = async (insurer: any) => {
    if (revealedPasswords[insurer.id]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[insurer.id];
        return next;
      });
      return;
    }

    try {
      const data = await api.directory.insurers.revealPassword(insurer.id);
      setRevealedPasswords((prev) => ({ ...prev, [insurer.id]: data.password || '' }));
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo revelar la credencial.', severity: 'error' });
    }
  };

  const exportCurrent = async () => {
    try {
      const blob = tab === 0 ? await api.directory.insurers.export() : await api.directory.brokers.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tab === 0 ? 'Aseguradoras_PAS_Alert.xlsx' : 'Brokers_PAS_Alert.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo exportar.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>Directorio</Typography>
          <Typography variant="body1" color="text.secondary">Aseguradoras, brokers, credenciales y facturacion asociada.</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, max-content)' }, gap: 1.5 }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={exportCurrent}>Exportar Excel</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => tab === 0 ? openInsurerDialog() : openBrokerDialog()}>
            {tab === 0 ? 'Nueva Aseguradora' : 'Nuevo Broker'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card><CardContent><Typography variant="overline" color="text.secondary">Aseguradoras</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.insurers}</Typography></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card><CardContent><Typography variant="overline" color="text.secondary">Brokers</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.brokers}</Typography></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card><CardContent><Typography variant="overline" color="text.secondary">Facturado ARS</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{formatMoney(stats.ars, 'ARS')}</Typography></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card><CardContent><Typography variant="overline" color="text.secondary">Facturado USD</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{formatMoney(stats.usd, 'USD')}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, value) => { setTab(value); setSearchTerm(''); }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Aseguradoras" />
          <Tab label="Brokers" />
        </Tabs>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder={tab === 0 ? 'Buscar por razon social o CUIT...' : 'Buscar por broker o email...'}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1080 }}>
            <TableHead sx={{ bgcolor: 'secondary.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }} />
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>CUIT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Brokers</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Facturado</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Portal</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {insurers.map((insurer) => (
                <React.Fragment key={insurer.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedInsurer(expandedInsurer === insurer.id ? null : insurer.id)}>
                        {expandedInsurer === insurer.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{insurer.razonSocial}</TableCell>
                    <TableCell>{insurer.cuit}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {(insurer.brokers || []).length > 0 ? insurer.brokers.map((broker: any) => (
                          <Chip key={broker.id} size="small" label={broker.nombre} sx={{ bgcolor: broker.color, color: 'white', fontWeight: 700 }} />
                        )) : <Typography variant="body2" color="text.secondary">-</Typography>}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(insurer.totalFacturadoARS, 'ARS')}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatMoney(insurer.totalFacturadoUSD, 'USD')} / {insurer.cantidadFacturas} facturas</Typography>
                    </TableCell>
                    <TableCell>
                      {insurer.portalUsername || insurer.hasPortalPassword ? (
                        <Chip size="small" icon={<KeyRound size={14} />} label={insurer.hasPortalPassword ? 'Con credencial' : 'Usuario guardado'} />
                      ) : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Editar"><IconButton onClick={() => openInsurerDialog(insurer)}><Edit size={18} /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton color="error" onClick={() => deleteInsurer(insurer)}><Trash2 size={18} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedInsurer === insurer.id} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 3, py: 2.5, bgcolor: 'action.hover' }}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary">Contacto</Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.75 }}>
                                <Typography variant="body2">{insurer.email || '-'}</Typography>
                                <Typography variant="body2">{insurer.telefono || '-'}</Typography>
                                <Typography variant="body2">{insurer.domicilioComercial || '-'}</Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary">Portal</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                                {insurer.websiteUrl && (
                                  <Button size="small" startIcon={<ExternalLink size={16} />} onClick={() => window.open(insurer.websiteUrl, '_blank')}>Abrir web</Button>
                                )}
                                {insurer.hasPortalPassword && (
                                  <Button size="small" startIcon={revealedPasswords[insurer.id] ? <EyeOff size={16} /> : <Eye size={16} />} onClick={() => revealPassword(insurer)}>
                                    {revealedPasswords[insurer.id] ? 'Ocultar clave' : 'Ver clave'}
                                  </Button>
                                )}
                              </Box>
                              <Typography variant="body2" sx={{ mt: 1 }}>Usuario: {insurer.portalUsername || '-'}</Typography>
                              {revealedPasswords[insurer.id] && <Typography variant="body2" sx={{ fontWeight: 700 }}>Clave: {revealedPasswords[insurer.id]}</Typography>}
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary">Datos fiscales</Typography>
                              <Typography variant="body2" sx={{ mt: 0.75 }}>IVA: {insurer.ivaCondition || '-'}</Typography>
                              <Typography variant="body2">Codigo productor: {insurer.producerCode || '-'}</Typography>
                              <Typography variant="body2">Notas: {insurer.notes || '-'}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {insurers.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>No hay aseguradoras</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 860 }}>
            <TableHead sx={{ bgcolor: 'secondary.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Broker</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Contacto</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradoras vinculadas</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {brokers.map((broker) => (
                <TableRow key={broker.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: broker.color }} />
                      <Typography sx={{ fontWeight: 700 }}>{broker.nombre}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{broker.contactoNombre || '-'}</Typography>
                    <Typography variant="caption" color="text.secondary">{broker.email || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {(broker.insurers || []).length > 0 ? broker.insurers.map((insurer: any) => (
                        <Chip key={insurer.id} size="small" label={insurer.razonSocial} variant="outlined" />
                      )) : <Typography variant="body2" color="text.secondary">-</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {broker.email && <Tooltip title="Email"><IconButton onClick={() => window.open(`mailto:${broker.email}`)}><Mail size={18} /></IconButton></Tooltip>}
                    <Tooltip title="Editar"><IconButton onClick={() => openBrokerDialog(broker)}><Edit size={18} /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton color="error" onClick={() => deleteBroker(broker)}><Trash2 size={18} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {brokers.length === 0 && (
                <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>No hay brokers</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={insurerDialogOpen} onClose={() => setInsurerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingInsurer ? 'Editar Aseguradora' : 'Nueva Aseguradora'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}><TextField fullWidth label="Razon Social" value={insurerForm.razonSocial} onChange={(e) => setInsurerForm((s) => ({ ...s, razonSocial: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="CUIT" value={insurerForm.cuit} onChange={(e) => setInsurerForm((s) => ({ ...s, cuit: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Domicilio Comercial" value={insurerForm.domicilioComercial} onChange={(e) => setInsurerForm((s) => ({ ...s, domicilioComercial: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Condicion IVA" value={insurerForm.ivaCondition} onChange={(e) => setInsurerForm((s) => ({ ...s, ivaCondition: e.target.value }))}>
                <MenuItem value="">Sin definir</MenuItem>
                {IVA_CONDITIONS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Email" value={insurerForm.email} onChange={(e) => setInsurerForm((s) => ({ ...s, email: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={16} /></InputAdornment> }} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Telefono" value={insurerForm.telefono} onChange={(e) => setInsurerForm((s) => ({ ...s, telefono: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={16} /></InputAdornment> }} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Web oficial" value={insurerForm.websiteUrl} onChange={(e) => setInsurerForm((s) => ({ ...s, websiteUrl: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Codigo productor" value={insurerForm.producerCode} onChange={(e) => setInsurerForm((s) => ({ ...s, producerCode: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Usuario portal" value={insurerForm.portalUsername} onChange={(e) => setInsurerForm((s) => ({ ...s, portalUsername: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="password" label={editingInsurer ? 'Nueva clave portal' : 'Clave portal'} value={insurerForm.portalPassword} onChange={(e) => setInsurerForm((s) => ({ ...s, portalPassword: e.target.value }))} /></Grid>
            {editingInsurer?.hasPortalPassword && (
              <Grid size={{ xs: 12 }}>
                <FormControlLabel control={<Checkbox checked={insurerForm.clearPortalPassword} onChange={(e) => setInsurerForm((s) => ({ ...s, clearPortalPassword: e.target.checked }))} />} label="Eliminar clave guardada" />
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple
                options={brokers}
                getOptionLabel={(option) => option.nombre || ''}
                value={brokers.filter((broker) => insurerForm.brokerIds.includes(broker.id))}
                onChange={(_, value) => setInsurerForm((s) => ({ ...s, brokerIds: value.map((broker) => broker.id) }))}
                renderInput={(params) => <TextField {...params} label="Brokers vinculados" />}
              />
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Notas" value={insurerForm.notes} onChange={(e) => setInsurerForm((s) => ({ ...s, notes: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setInsurerDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveInsurer} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={brokerDialogOpen} onClose={() => setBrokerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingBroker ? 'Editar Broker' : 'Nuevo Broker'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Nombre" value={brokerForm.nombre} onChange={(e) => setBrokerForm((s) => ({ ...s, nombre: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {BROKER_COLORS.map((color) => (
                  <IconButton key={color} onClick={() => setBrokerForm((s) => ({ ...s, color }))} sx={{ border: brokerForm.color === color ? '2px solid' : '1px solid', borderColor: brokerForm.color === color ? 'text.primary' : 'divider' }}>
                    <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: color }} />
                  </IconButton>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Contacto principal" value={brokerForm.contactoNombre} onChange={(e) => setBrokerForm((s) => ({ ...s, contactoNombre: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Email" value={brokerForm.email} onChange={(e) => setBrokerForm((s) => ({ ...s, email: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple
                options={insurers}
                getOptionLabel={(option) => option.razonSocial || ''}
                value={insurers.filter((insurer) => brokerForm.insurerIds.includes(insurer.id))}
                onChange={(_, value) => setBrokerForm((s) => ({ ...s, insurerIds: value.map((insurer) => insurer.id) }))}
                renderInput={(params) => <TextField {...params} label="Aseguradoras vinculadas" />}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setBrokerDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveBroker} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};
