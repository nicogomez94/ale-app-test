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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
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
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Banknote,
  Phone,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
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
  portalLoginUrl: '',
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
  telefono: '',
  insurerIds: [] as string[],
};

export const DirectoryPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [insurers, setInsurers] = useState<any[]>([]);
  const [allInsurers, setAllInsurers] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsurer, setExpandedInsurer] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [insurerMenuAnchor, setInsurerMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedInsurerForMenu, setSelectedInsurerForMenu] = useState<any | null>(null);
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

  const financialTotals = useMemo(() => allInsurers.reduce(
    (totals, insurer) => ({
      ars: totals.ars + Number(insurer.totalFacturadoARS || 0),
      usd: totals.usd + Number(insurer.totalFacturadoUSD || 0),
      invoices: totals.invoices + Number(insurer.cantidadFacturas || 0),
    }),
    { ars: 0, usd: 0, invoices: 0 },
  ), [allInsurers]);

  const formatMoney = (value: number, currency: 'ARS' | 'USD') =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insurerData, brokerData, allInsurerData] = await Promise.all([
        api.directory.insurers.list(tab === 0 ? searchTerm : undefined),
        api.directory.brokers.list(tab === 1 ? searchTerm : undefined),
        api.directory.insurers.list(),
      ]);
      setInsurers(insurerData);
      setAllInsurers(allInsurerData);
      setBrokers(brokerData);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo cargar el directorio.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tab, searchTerm]);

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
          portalLoginUrl: insurer.portalLoginUrl || '',
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
          telefono: broker.telefono || '',
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

  const openUrl = (url?: string) => {
    if (!url) return;
    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
  };

  const handleInsurerChipClick = (event: React.MouseEvent<HTMLElement>, insurer: any) => {
    setInsurerMenuAnchor(event.currentTarget);
    setSelectedInsurerForMenu(insurer);
  };

  const closeInsurerMenu = () => {
    setInsurerMenuAnchor(null);
    setSelectedInsurerForMenu(null);
  };

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', overflowWrap: 'anywhere' }}>Compañias y Brokers</Typography>
          <Typography variant="body1" color="text.secondary">Registro de compañías, brokers y comisiones.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color={tab === 0 ? 'primary' : 'secondary'} startIcon={<Plus size={20} />} onClick={() => tab === 0 ? openInsurerDialog() : openBrokerDialog()} sx={{ borderRadius: 3, fontWeight: 700 }}>
            {tab === 0 ? 'Nueva Aseguradora' : 'Nuevo Broker / Org.'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3, display: tab === 0 ? 'flex' : 'none' }}>
        {[
          { label: 'Total facturado ARS', value: formatMoney(financialTotals.ars, 'ARS'), icon: <Banknote size={22} />, color: '#2563eb' },
          { label: 'Total facturado USD', value: formatMoney(financialTotals.usd, 'USD'), icon: <Banknote size={22} />, color: '#16a34a' },
          { label: 'Facturas emitidas', value: String(financialTotals.invoices), icon: <Receipt size={22} />, color: '#9333ea' },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
            <Card sx={{ height: '100%', borderLeft: `5px solid ${item.color}` }}>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ color: item.color }}>{item.icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{item.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tab} onChange={(_, value) => { setTab(value); setSearchTerm(''); }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Aseguradoras" sx={{ fontWeight: 700 }} />
          <Tab label="Brokers / Organizadores" sx={{ fontWeight: 700 }} />
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
        <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Table sx={{ minWidth: 1080 }}>
            <TableHead sx={{ bgcolor: 'primary.main' }}>
              <TableRow>
                <TableCell sx={{ width: 50 }} />
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Razón Social</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>CUIT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Condición IVA</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Contacto</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Web</TableCell>
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
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, bgcolor: 'primary.light', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                          <ShieldCheck size={24} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{insurer.razonSocial}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MapPin size={12} /> {insurer.domicilioComercial || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{insurer.cuit}</TableCell>
                    <TableCell>
                      <Chip
                        label={insurer.ivaCondition || '-'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderColor: 'primary.main', color: 'primary.main' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                          <Mail size={12} /> {insurer.email || '-'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                          <Phone size={12} /> {insurer.telefono || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {insurer.websiteUrl ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Globe size={14} />}
                          onClick={() => openUrl(insurer.websiteUrl)}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                          Acceder Web
                        </Button>
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
                        <Box sx={{ m: 2, p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>
                            Información Detallada - {insurer.razonSocial}
                          </Typography>
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Datos Fiscales</Typography>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2"><strong>CUIT:</strong> {insurer.cuit}</Typography>
                                <Typography variant="body2"><strong>Condición IVA:</strong> {insurer.ivaCondition || '-'}</Typography>
                                <Typography variant="body2"><strong>Domicilio:</strong> {insurer.domicilioComercial || '-'}</Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Contacto</Typography>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2"><strong>Email:</strong> {insurer.email || '-'}</Typography>
                                <Typography variant="body2"><strong>Teléfono:</strong> {insurer.telefono || '-'}</Typography>
                                <Typography variant="body2"><strong>Web:</strong> {insurer.websiteUrl || '-'}</Typography>
                                <Typography variant="body2"><strong>Login PAS:</strong> {insurer.portalLoginUrl || '-'}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                {insurer.websiteUrl && (
                                  <Button size="small" startIcon={<ExternalLink size={16} />} onClick={() => openUrl(insurer.websiteUrl)}>Abrir web</Button>
                                )}
                                {insurer.portalLoginUrl && (
                                  <Button size="small" startIcon={<Globe size={16} />} onClick={() => openUrl(insurer.portalLoginUrl)}>Login PAS</Button>
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
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Acceso y Notas</Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}><strong>Usuario:</strong> {insurer.portalUsername || '-'}</Typography>
                              <Typography variant="body2">
                                <strong>Contraseña:</strong> {revealedPasswords[insurer.id] || (insurer.hasPortalPassword ? '••••••••' : '-')}
                              </Typography>
                              <Typography variant="body2"><strong>Cód. Cliente:</strong> {insurer.producerCode || '-'}</Typography>
                              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}><strong>Notas:</strong> {insurer.notes || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Resumen de facturación</Typography>
                              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
                                <Typography variant="body2"><strong>ARS:</strong> {formatMoney(Number(insurer.totalFacturadoARS || 0), 'ARS')}</Typography>
                                <Typography variant="body2"><strong>USD:</strong> {formatMoney(Number(insurer.totalFacturadoUSD || 0), 'USD')}</Typography>
                                <Typography variant="body2"><strong>Facturas:</strong> {insurer.cantidadFacturas || 0}</Typography>
                              </Box>
                              {(insurer.invoices || []).length > 0 && (
                                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {insurer.invoices.slice(0, 6).map((invoice: any) => (
                                    <Chip
                                      key={invoice.id}
                                      size="small"
                                      label={`${invoice.numeroFactura} · ${invoice.periodo} · ${formatMoney(Number(invoice.monto || 0), invoice.moneda === 'USD' ? 'USD' : 'ARS')}`}
                                    />
                                  ))}
                                </Box>
                              )}
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
        <Grid container spacing={3}>
          {brokers.map((broker) => (
            <Grid size={{ xs: 12, md: 6 }} key={broker.id}>
              <Card sx={{ borderRadius: 3, borderLeft: `8px solid ${broker.color}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: broker.color }}>{broker.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <UsersIcon size={14} /> {broker.contactoNombre || 'Sin contacto'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Mail size={14} /> {broker.email || 'Sin mail'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Phone size={14} /> {broker.telefono || 'Sin celular'}
                      </Typography>
                    </Box>
                    <Box sx={{ whiteSpace: 'nowrap' }}>
                      {broker.email && <Tooltip title="Email"><IconButton size="small" onClick={() => window.open(`mailto:${broker.email}`)}><Mail size={18} /></IconButton></Tooltip>}
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => openBrokerDialog(broker)} color="primary"><Edit size={18} /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => deleteBroker(broker)}><Trash2 size={18} /></IconButton></Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<MessageSquare size={14} />}
                      onClick={() => broker.telefono && window.open(`https://wa.me/${String(broker.telefono).replace(/\D/g, '')}`, '_blank')}
                      disabled={!broker.telefono}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, flex: 1, fontSize: '0.75rem' }}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Mail size={14} />}
                      onClick={() => broker.email && window.open(`mailto:${broker.email}`)}
                      disabled={!broker.email}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, flex: 1, fontSize: '0.75rem' }}
                    >
                      Email
                    </Button>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Aseguradoras asignadas:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(broker.insurers || []).length > 0 ? broker.insurers.map((insurer: any) => (
                      <Tooltip title="Ver accesos (Sitio Web / Login PAS)" key={insurer.id}>
                        <Chip
                          label={insurer.razonSocial}
                          size="small"
                          onClick={(event) => handleInsurerChipClick(event, insurer)}
                          sx={{
                            bgcolor: 'white',
                            border: `1px solid ${broker.color}`,
                            color: broker.color,
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: `${broker.color}11`, transform: 'translateY(-1px)' },
                          }}
                        />
                      </Tooltip>
                    )) : <Typography variant="caption" color="text.secondary">No hay aseguradoras asignadas</Typography>}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {brokers.length === 0 && (
            <Grid size={12}>
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">No hay brokers u organizadores registrados</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
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
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="URL Acceso Login PAS" value={insurerForm.portalLoginUrl} onChange={(e) => setInsurerForm((s) => ({ ...s, portalLoginUrl: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><ExternalLink size={16} /></InputAdornment> }} /></Grid>
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
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Número de celular" placeholder="+5491155554321" value={brokerForm.telefono} onChange={(e) => setBrokerForm((s) => ({ ...s, telefono: e.target.value }))} helperText="Número con prefijo internacional para WhatsApp." /></Grid>
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

      <Menu
        anchorEl={insurerMenuAnchor}
        open={Boolean(insurerMenuAnchor)}
        onClose={closeInsurerMenu}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 230, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
            Accesos de Aseguradora
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {selectedInsurerForMenu?.razonSocial}
          </Typography>
        </Box>
        <MenuItem
          onClick={() => {
            openUrl(selectedInsurerForMenu?.websiteUrl);
            closeInsurerMenu();
          }}
          disabled={!selectedInsurerForMenu?.websiteUrl}
        >
          <Globe size={16} style={{ marginRight: 8 }} /> Sitio web
        </MenuItem>
        <MenuItem
          onClick={() => {
            openUrl(selectedInsurerForMenu?.portalLoginUrl);
            closeInsurerMenu();
          }}
          disabled={!selectedInsurerForMenu?.portalLoginUrl}
        >
          <ExternalLink size={16} style={{ marginRight: 8 }} /> Login PAS
        </MenuItem>
      </Menu>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};
