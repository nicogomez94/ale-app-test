import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton,
  InputAdornment, Link, MenuItem, Paper, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { CreditCard, Download, Edit, ExternalLink, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../api';

type Currency = 'ARS' | 'USD';
type InvoiceStatus = 'PENDIENTE' | 'FACTURADA' | 'COBRADA' | 'PARCIAL' | 'VENCIDA';

type Insurer = { id: string; razonSocial: string };
type PolicyOption = {
  id: string;
  clienteNombre: string;
  aseguradora: string;
  numeroPoliza: string;
  moneda: string;
  comisionCalculada: number;
  cuotaActual: number;
  cuotaTotal: number;
};
type InvoicePayment = { id: string; fechaPago: string; monto: number; medioPago?: string; comprobanteUrl?: string };
type LinkedPolicy = PolicyOption & { rubro?: string };
type Invoice = {
  id: string;
  insuranceCompanyId: string;
  insuranceCompany?: Insurer;
  periodo: string;
  numeroFactura: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: InvoiceStatus;
  estadoCalculado: InvoiceStatus;
  monto: number;
  moneda: Currency;
  comprobanteUrl?: string;
  notes?: string;
  montoCobrado: number;
  saldoPendiente: number;
  montoEsperado: number;
  diferenciaDetectada: boolean;
  payments: InvoicePayment[];
  policies: LinkedPolicy[];
};

const today = () => new Date().toISOString().split('T')[0];
const currentPeriod = () => today().slice(0, 7);
const emptyInvoice = {
  insuranceCompanyId: '', periodo: currentPeriod(), numeroFactura: '', fechaEmision: today(),
  fechaVencimiento: '', estado: 'PENDIENTE' as InvoiceStatus, monto: '', moneda: 'ARS' as Currency,
  comprobanteUrl: '', notes: '', policyIds: [] as string[],
};
const emptyPayment = { fechaPago: today(), monto: '', medioPago: 'Transferencia', comprobanteUrl: '' };

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDIENTE: 'Pendiente', FACTURADA: 'Facturada', COBRADA: 'Cobrada', PARCIAL: 'Parcial', VENCIDA: 'Vencida',
};
const STATUS_COLORS: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDIENTE: 'default', FACTURADA: 'info', COBRADA: 'success', PARCIAL: 'warning', VENCIDA: 'error',
};
const money = (value: number, currency: Currency) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const BillingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState(emptyInvoice);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState(emptyPayment);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceData, insurerData, policyData] = await Promise.all([
        api.commissions.invoices.list(), api.directory.insurers.list(), api.policies.list(),
      ]);
      setInvoices(invoiceData as Invoice[]);
      setInsurers(insurerData as Insurer[]);
      setPolicies(policyData as unknown as PolicyOption[]);
      if (detail) setDetail((invoiceData as Invoice[]).find((item) => item.id === detail.id) || null);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo cargar la facturación.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) => [invoice.insuranceCompany?.razonSocial, invoice.periodo, invoice.numeroFactura]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [invoices, search]);

  const eligiblePolicies = useMemo(() => {
    const insurer = insurers.find((item) => item.id === form.insuranceCompanyId);
    if (!insurer) return [];
    const name = insurer.razonSocial.trim().toLowerCase();
    return policies.filter((policy) => policy.moneda === form.moneda && policy.aseguradora.trim().toLowerCase() === name);
  }, [form.insuranceCompanyId, form.moneda, insurers, policies]);

  const totals = useMemo(() => invoices.reduce((acc, invoice) => ({
    facturado: acc.facturado + Number(invoice.monto || 0),
    cobrado: acc.cobrado + Number(invoice.montoCobrado || 0),
  }), { facturado: 0, cobrado: 0 }), [invoices]);

  const openForm = (invoice?: Invoice) => {
    setEditing(invoice || null);
    setForm(invoice ? {
      insuranceCompanyId: invoice.insuranceCompanyId || '', periodo: invoice.periodo, numeroFactura: invoice.numeroFactura,
      fechaEmision: invoice.fechaEmision, fechaVencimiento: invoice.fechaVencimiento || '', estado: invoice.estado,
      monto: String(invoice.monto), moneda: invoice.moneda, comprobanteUrl: invoice.comprobanteUrl || '',
      notes: invoice.notes || '', policyIds: invoice.policies.map((policy) => policy.id),
    } : { ...emptyInvoice, periodo: currentPeriod(), fechaEmision: today(), policyIds: [] });
    setFormOpen(true);
  };

  const saveInvoice = async () => {
    setSaving(true);
    try {
      const payload = { ...form, monto: Number(form.monto) };
      if (editing) await api.commissions.invoices.update(editing.id, payload);
      else await api.commissions.invoices.create(payload);
      setFormOpen(false);
      setSnack({ open: true, message: 'Factura guardada.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo guardar la factura.', severity: 'error' });
    } finally { setSaving(false); }
  };

  const deleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`¿Eliminar la factura ${invoice.numeroFactura}?`)) return;
    try { await api.commissions.invoices.delete(invoice.id); await loadData(); }
    catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo eliminar.', severity: 'error' }); }
  };

  const addPayment = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await api.commissions.invoices.addPayment(detail.id, { ...payment, monto: Number(payment.monto) }) as Invoice;
      setDetail(updated);
      setPayment({ ...emptyPayment, fechaPago: today() });
      setSnack({ open: true, message: 'Pago registrado.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo registrar el pago.', severity: 'error' });
    } finally { setSaving(false); }
  };

  const removePayment = async (paymentId: string) => {
    if (!detail || !window.confirm('¿Eliminar este pago?')) return;
    try {
      const updated = await api.commissions.invoices.deletePayment(detail.id, paymentId) as Invoice;
      setDetail(updated);
      await loadData();
    } catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo eliminar el pago.', severity: 'error' }); }
  };

  const exportInvoices = async () => {
    try { downloadBlob(await api.commissions.invoices.export(), 'Facturas_Comisiones_PAS_Alert.xlsx'); }
    catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo exportar.', severity: 'error' }); }
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>Comisiones</Typography><Typography color="text.secondary">Facturado, cobrado y detalle histórico por período.</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}><Button variant="outlined" startIcon={<Download size={18} />} onClick={exportInvoices}>Exportar</Button><Button variant="contained" startIcon={<Plus size={18} />} onClick={() => openForm()}>Nueva factura</Button></Box>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="caption" color="text.secondary" fontWeight={800}>Total facturado</Typography><Typography variant="h4" fontWeight={900}>{money(totals.facturado, 'ARS')}</Typography></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="caption" color="text.secondary" fontWeight={800}>Total cobrado</Typography><Typography variant="h4" fontWeight={900} color="success.main">{money(totals.cobrado, 'ARS')}</Typography></CardContent></Card></Grid>
      </Grid>
      <Card sx={{ mb: 3 }}><CardContent><TextField fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por aseguradora, período o número..." InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }} /></CardContent></Card>
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 1120 }}>
          <TableHead><TableRow><TableCell>Aseguradora</TableCell><TableCell>Período / Factura</TableCell><TableCell>Emisión / Vto.</TableCell><TableCell>Estado</TableCell><TableCell align="right">Facturado</TableCell><TableCell align="right">Cobrado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
          <TableBody>{filteredInvoices.map((invoice) => <TableRow key={invoice.id} hover>
            <TableCell sx={{ fontWeight: 700 }}>{invoice.insuranceCompany?.razonSocial || '-'}</TableCell>
            <TableCell><Typography variant="body2" fontWeight={700}>{invoice.numeroFactura}</Typography><Typography variant="caption">{invoice.periodo}</Typography></TableCell>
            <TableCell><Typography variant="caption" display="block">{invoice.fechaEmision}</Typography><Typography variant="caption">{invoice.fechaVencimiento || '-'}</Typography></TableCell>
            <TableCell><Chip size="small" color={STATUS_COLORS[invoice.estadoCalculado]} label={STATUS_LABELS[invoice.estadoCalculado]} /></TableCell>
            <TableCell align="right">{money(invoice.monto, invoice.moneda)}</TableCell><TableCell align="right">{money(invoice.montoCobrado, invoice.moneda)}</TableCell>
            <TableCell align="right"><Tooltip title="Ver detalle"><IconButton onClick={() => { setDetail(invoice); setPayment({ ...emptyPayment, monto: String(invoice.saldoPendiente) }); }}><Eye size={17} /></IconButton></Tooltip><Tooltip title="Editar"><IconButton onClick={() => openForm(invoice)}><Edit size={17} /></IconButton></Tooltip><Tooltip title="Eliminar"><IconButton color="error" onClick={() => deleteInvoice(invoice)}><Trash2 size={17} /></IconButton></Tooltip></TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Editar factura' : 'Nueva factura de comisión'}</DialogTitle><DialogContent dividers><Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth required label="Aseguradora" value={form.insuranceCompanyId} onChange={(e) => setForm((s) => ({ ...s, insuranceCompanyId: e.target.value, policyIds: [] }))}>{insurers.map((item) => <MenuItem key={item.id} value={item.id}>{item.razonSocial}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth required type="month" label="Período" InputLabelProps={{ shrink: true }} value={form.periodo} onChange={(e) => setForm((s) => ({ ...s, periodo: e.target.value }))} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth label="Estado inicial" value={form.estado} onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as InvoiceStatus }))}><MenuItem value="PENDIENTE">Pendiente</MenuItem><MenuItem value="FACTURADA">Facturada</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth required label="Número de factura" value={form.numeroFactura} onChange={(e) => setForm((s) => ({ ...s, numeroFactura: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth required type="date" label="Emisión" InputLabelProps={{ shrink: true }} value={form.fechaEmision} onChange={(e) => setForm((s) => ({ ...s, fechaEmision: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth type="date" label="Vencimiento" InputLabelProps={{ shrink: true }} value={form.fechaVencimiento} onChange={(e) => setForm((s) => ({ ...s, fechaVencimiento: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth required type="number" label="Monto" value={form.monto} onChange={(e) => setForm((s) => ({ ...s, monto: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField select fullWidth label="Moneda" value={form.moneda} onChange={(e) => setForm((s) => ({ ...s, moneda: e.target.value as Currency, policyIds: [] }))}><MenuItem value="ARS">ARS</MenuItem><MenuItem value="USD">USD</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="URL del comprobante" value={form.comprobanteUrl} onChange={(e) => setForm((s) => ({ ...s, comprobanteUrl: e.target.value }))} /></Grid>
          <Grid size={12}><Autocomplete multiple options={eligiblePolicies} value={eligiblePolicies.filter((p) => form.policyIds.includes(p.id))} getOptionLabel={(p) => `${p.numeroPoliza} · ${p.clienteNombre} · ${money(p.comisionCalculada, form.moneda)}`} onChange={(_, values) => setForm((s) => ({ ...s, policyIds: values.map((p) => p.id) }))} renderInput={(params) => <TextField {...params} label="Pólizas vinculadas" helperText="Se muestran pólizas de la aseguradora y moneda elegidas." />} /></Grid>
          <Grid size={12}><TextField fullWidth multiline minRows={2} label="Notas" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Grid>
        </Grid></DialogContent><DialogActions><Button onClick={() => setFormOpen(false)}>Cancelar</Button><Button variant="contained" disabled={saving || !form.insuranceCompanyId || !form.periodo || !form.numeroFactura || Number(form.monto) <= 0} onClick={saveInvoice}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth><DialogTitle>Detalle de factura {detail?.numeroFactura}</DialogTitle>{detail && <DialogContent dividers>
        <Grid container spacing={2}><Grid size={{ xs: 12, md: 4 }}><Typography variant="caption">Estado</Typography><Box><Chip size="small" color={STATUS_COLORS[detail.estadoCalculado]} label={STATUS_LABELS[detail.estadoCalculado]} /></Box></Grid><Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Facturado</Typography><Typography fontWeight={700}>{money(detail.monto, detail.moneda)}</Typography></Grid><Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Cobrado</Typography><Typography fontWeight={700}>{money(detail.montoCobrado, detail.moneda)}</Typography></Grid></Grid>
        {detail.comprobanteUrl && <Link href={detail.comprobanteUrl} target="_blank" rel="noreferrer" sx={{ mt: 2, display: 'inline-flex', gap: 1 }}>Abrir comprobante <ExternalLink size={15} /></Link>}
        <Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={800}>Pólizas vinculadas</Typography>{detail.policies.length ? detail.policies.map((policy) => <Chip key={policy.id} sx={{ mr: 1, mt: 1 }} label={`${policy.numeroPoliza} · ${policy.clienteNombre} · ${policy.cuotaActual}/${policy.cuotaTotal}`} />) : <Typography color="text.secondary">Sin pólizas vinculadas.</Typography>}
        <Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={800}>Pagos</Typography>{detail.payments.map((item) => <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}><Box><Typography fontWeight={700}>{money(item.monto, detail.moneda)}</Typography><Typography variant="caption">{item.fechaPago} · {item.medioPago || 'Sin medio'} {item.comprobanteUrl && <>· <Link href={item.comprobanteUrl} target="_blank">Comprobante</Link></>}</Typography></Box><IconButton color="error" onClick={() => removePayment(item.id)}><Trash2 size={17} /></IconButton></Box>)}
        {detail.saldoPendiente > 0 && <Card variant="outlined" sx={{ mt: 2 }}><CardContent><Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2 }}>Registrar pago parcial</Typography><Grid container spacing={2}><Grid size={{ xs: 6, md: 3 }}><TextField fullWidth type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={payment.fechaPago} onChange={(e) => setPayment((s) => ({ ...s, fechaPago: e.target.value }))} /></Grid><Grid size={{ xs: 6, md: 3 }}><TextField fullWidth type="number" label="Monto" value={payment.monto} onChange={(e) => setPayment((s) => ({ ...s, monto: e.target.value }))} /></Grid><Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth label="Medio" value={payment.medioPago} onChange={(e) => setPayment((s) => ({ ...s, medioPago: e.target.value }))}><MenuItem value="Transferencia">Transferencia</MenuItem><MenuItem value="Efectivo">Efectivo</MenuItem><MenuItem value="Cheque">Cheque</MenuItem><MenuItem value="Otro">Otro</MenuItem></TextField></Grid><Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="URL comprobante" value={payment.comprobanteUrl} onChange={(e) => setPayment((s) => ({ ...s, comprobanteUrl: e.target.value }))} /></Grid></Grid><Button sx={{ mt: 2 }} variant="contained" startIcon={<CreditCard size={17} />} disabled={saving || Number(payment.monto) <= 0 || Number(payment.monto) > detail.saldoPendiente} onClick={addPayment}>Registrar pago</Button></CardContent></Card>}
      </DialogContent>}<DialogActions><Button onClick={() => setDetail(null)}>Cerrar</Button></DialogActions></Dialog>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}><Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert></Snackbar>
    </Box>
  );
};
