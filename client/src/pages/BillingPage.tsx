import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle2,
  Circle,
  Edit,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../api';

const today = () => new Date().toISOString().split('T')[0];

const currentPeriodLabel = () => {
  const date = new Date();
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, (char) => char.toUpperCase());
};

const emptyInvoiceForm = {
  insuranceCompanyId: '',
  periodo: currentPeriodLabel(),
  numeroFactura: '',
  monto: '',
  moneda: 'ARS',
};

const formatAmount = (value: number, currency: string) =>
  `${currency === 'USD' ? 'u$s' : '$'} ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const isFacturada = (invoice: any) => invoice.estadoCalculado !== 'PENDIENTE';
const isCobrada = (invoice: any) => invoice.estadoCalculado === 'COBRADA';

export const BillingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState(emptyInvoiceForm);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceData, insurerData] = await Promise.all([
        api.commissions.invoices.list(),
        api.directory.insurers.list(),
      ]);
      setInvoices(invoiceData);
      setInsurers(insurerData);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo cargar la facturación.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return invoices;
    return invoices.filter((invoice) => {
      const insurerName = invoice.insuranceCompany?.razonSocial || '';
      return (
        insurerName.toLowerCase().includes(normalized) ||
        String(invoice.periodo || '').toLowerCase().includes(normalized) ||
        String(invoice.numeroFactura || '').toLowerCase().includes(normalized)
      );
    });
  }, [invoices, searchTerm]);

  const handleOpenInvoiceDialog = (invoice?: any) => {
    setEditingInvoice(invoice || null);
    setInvoiceData(invoice
      ? {
          insuranceCompanyId: invoice.insuranceCompanyId || '',
          periodo: invoice.periodo || '',
          numeroFactura: invoice.numeroFactura || '',
          monto: String(invoice.monto || ''),
          moneda: invoice.moneda || 'ARS',
        }
      : { ...emptyInvoiceForm, periodo: currentPeriodLabel() });
    setDialogOpen(true);
  };

  const handleSaveInvoice = async () => {
    setSaving(true);
    try {
      const payload = {
        insuranceCompanyId: invoiceData.insuranceCompanyId || null,
        periodo: invoiceData.periodo,
        numeroFactura: invoiceData.numeroFactura || '-',
        fechaEmision: editingInvoice?.fechaEmision || today(),
        fechaVencimiento: editingInvoice?.fechaVencimiento || '',
        estado: editingInvoice?.estado || 'PENDIENTE',
        monto: Number(invoiceData.monto),
        moneda: invoiceData.moneda,
        comprobanteUrl: editingInvoice?.comprobanteUrl || '',
        notes: editingInvoice?.notes || '',
        policyIds: (editingInvoice?.policies || []).map((policy: any) => policy.id),
      };

      if (editingInvoice) {
        await api.commissions.invoices.update(editingInvoice.id, payload);
      } else {
        await api.commissions.invoices.create(payload);
      }

      setDialogOpen(false);
      setSnack({ open: true, message: 'Factura guardada.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo guardar la factura.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta factura?')) return;
    try {
      await api.commissions.invoices.delete(invoice.id);
      setSnack({ open: true, message: 'Factura eliminada.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo eliminar la factura.', severity: 'error' });
    }
  };

  const handleToggleFacturada = async (invoice: any) => {
    try {
      await api.commissions.invoices.update(invoice.id, {
        insuranceCompanyId: invoice.insuranceCompanyId || null,
        periodo: invoice.periodo,
        numeroFactura: invoice.numeroFactura,
        fechaEmision: invoice.fechaEmision || today(),
        fechaVencimiento: invoice.fechaVencimiento || '',
        estado: isFacturada(invoice) ? 'PENDIENTE' : 'FACTURADA',
        monto: Number(invoice.monto),
        moneda: invoice.moneda,
        comprobanteUrl: invoice.comprobanteUrl || '',
        notes: invoice.notes || '',
        policyIds: (invoice.policies || []).map((policy: any) => policy.id),
      });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo actualizar la factura.', severity: 'error' });
    }
  };

  const handleToggleCobrada = async (invoice: any) => {
    if (!isFacturada(invoice)) return;
    try {
      if (isCobrada(invoice)) {
        await api.commissions.invoices.update(invoice.id, {
          insuranceCompanyId: invoice.insuranceCompanyId || null,
          periodo: invoice.periodo,
          numeroFactura: invoice.numeroFactura,
          fechaEmision: invoice.fechaEmision || today(),
          fechaVencimiento: invoice.fechaVencimiento || '',
          estado: 'FACTURADA',
          monto: Number(invoice.monto),
          moneda: invoice.moneda,
          comprobanteUrl: invoice.comprobanteUrl || '',
          notes: invoice.notes || '',
          policyIds: (invoice.policies || []).map((policy: any) => policy.id),
        });
      } else {
        await api.commissions.invoices.addPayment(invoice.id, {
          fechaPago: today(),
          monto: Number(invoice.saldoPendiente || invoice.monto || 0),
          medioPago: 'Manual',
          comprobanteUrl: '',
        });
      }
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo actualizar el cobro.', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>Facturación de Comisiones</Typography>
          <Typography variant="body1" color="text.secondary">Control centralizado de facturas y cobros de todas las aseguradoras</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={() => handleOpenInvoiceDialog()}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Nueva Factura
        </Button>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Buscar por aseguradora, periodo o nro de factura..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 980 }}>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Aseguradora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Periodo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>N° Factura</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Monto</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Facturada</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Cobrada</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{invoice.insuranceCompany?.razonSocial || '-'}</TableCell>
                  <TableCell>{invoice.periodo}</TableCell>
                  <TableCell>{invoice.numeroFactura || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{formatAmount(invoice.monto, invoice.moneda)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleFacturada(invoice)}
                      color={isFacturada(invoice) ? 'success' : 'default'}
                    >
                      {isFacturada(invoice) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      disabled={!isFacturada(invoice)}
                      onClick={() => handleToggleCobrada(invoice)}
                      color={isCobrada(invoice) ? 'success' : 'default'}
                    >
                      {isCobrada(invoice) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenInvoiceDialog(invoice)} color="primary">
                        <Edit size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => handleDeleteInvoice(invoice)} color="error">
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                    <Typography color="text.secondary">No se encontraron registros de facturación</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingInvoice ? 'Editar Factura' : 'Nueva Factura de Comisión'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                label="Aseguradora"
                value={invoiceData.insuranceCompanyId}
                onChange={(event) => setInvoiceData((prev) => ({ ...prev, insuranceCompanyId: event.target.value }))}
                disabled={!!editingInvoice}
              >
                {insurers.map((insurer) => (
                  <MenuItem key={insurer.id} value={insurer.id}>{insurer.razonSocial}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Periodo (ej: Abril 2026 - 1ra Quincena)"
                value={invoiceData.periodo}
                onChange={(event) => setInvoiceData((prev) => ({ ...prev, periodo: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Monto"
                type="number"
                value={invoiceData.monto}
                onChange={(event) => setInvoiceData((prev) => ({ ...prev, monto: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                label="Moneda"
                value={invoiceData.moneda}
                onChange={(event) => setInvoiceData((prev) => ({ ...prev, moneda: event.target.value }))}
              >
                <MenuItem value="ARS">ARS ($)</MenuItem>
                <MenuItem value="USD">USD (u$s)</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Número de Factura"
                value={invoiceData.numeroFactura}
                onChange={(event) => setInvoiceData((prev) => ({ ...prev, numeroFactura: event.target.value }))}
                placeholder="0001-00000XXX"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button
            onClick={handleSaveInvoice}
            variant="contained"
            disabled={!invoiceData.insuranceCompanyId || !invoiceData.periodo || !invoiceData.monto || saving}
          >
            {saving ? 'Guardando...' : 'Guardar Factura'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};
