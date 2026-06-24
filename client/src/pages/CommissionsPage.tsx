import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, MenuItem,
  Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { CheckCircle2, Clock, Download, FileText, Receipt, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

type Currency = 'ARS' | 'USD';
type Invoice = {
  id: string;
  insuranceCompany?: { razonSocial: string };
  periodo: string;
  numeroFactura: string;
  fechaEmision: string;
  estadoCalculado: 'PENDIENTE' | 'FACTURADA' | 'COBRADA' | 'PARCIAL' | 'VENCIDA';
  monto: number;
  moneda: Currency;
  montoCobrado: number;
  saldoPendiente: number;
  montoEsperado: number;
  diferenciaDetectada: boolean;
};

const STATUS_LABELS = { PENDIENTE: 'Pendiente', FACTURADA: 'Facturada', COBRADA: 'Cobrada', PARCIAL: 'Parcial', VENCIDA: 'Vencida' };
const money = (value: number, currency: Currency) => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0);

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Gestion_Comisiones_PAS.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export const CommissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    api.commissions.invoices.list()
      .then((data) => setInvoices(data as Invoice[]))
      .catch((error) => setSnack({ open: true, message: error.message || 'No se pudieron cargar las comisiones.', severity: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => invoices.filter((invoice) => invoice.moneda === currency), [invoices, currency]);
  const stats = useMemo(() => filtered.reduce((acc, invoice) => ({
    expected: acc.expected + invoice.montoEsperado,
    billed: acc.billed + invoice.monto,
    collected: acc.collected + invoice.montoCobrado,
    pending: acc.pending + invoice.saldoPendiente,
    differences: acc.differences + (invoice.diferenciaDetectada ? 1 : 0),
  }), { expected: 0, billed: 0, collected: 0, pending: 0, differences: 0 }), [filtered]);

  const chartData = useMemo(() => {
    const periods = new Map<string, { periodo: string; facturado: number; cobrado: number }>();
    filtered.forEach((invoice) => {
      const current = periods.get(invoice.periodo) || { periodo: invoice.periodo, facturado: 0, cobrado: 0 };
      current.facturado += invoice.monto;
      current.cobrado += invoice.montoCobrado;
      periods.set(invoice.periodo, current);
    });
    return Array.from(periods.values()).sort((a, b) => a.periodo.localeCompare(b.periodo)).slice(-12);
  }, [filtered]);

  const exportReport = async () => {
    try { downloadBlob(await api.commissions.invoices.export()); }
    catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo exportar.', severity: 'error' }); }
  };

  if (loading) return <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>Gestión Financiera de Comisiones</Typography><Typography color="text.secondary">Control real de facturación, diferencias y cobranzas.</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}><TextField select size="small" label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} sx={{ minWidth: 120 }}><MenuItem value="ARS">ARS</MenuItem><MenuItem value="USD">USD</MenuItem></TextField><Button variant="outlined" startIcon={<Download size={18} />} onClick={exportReport}>Exportar</Button><Button variant="contained" startIcon={<Receipt size={18} />} onClick={() => navigate('/facturacion')}>Administrar facturas</Button></Box>
      </Box>

      {stats.differences > 0 && <Alert severity="warning" sx={{ mb: 3 }}>Hay {stats.differences} factura(s) en {currency} con diferencias respecto de las pólizas vinculadas.</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Comisión esperada', value: stats.expected, icon: <TrendingUp size={22} />, color: '#6366f1' },
          { label: 'Total facturado', value: stats.billed, icon: <FileText size={22} />, color: '#2563eb' },
          { label: 'Total cobrado', value: stats.collected, icon: <CheckCircle2 size={22} />, color: '#16a34a' },
          { label: 'Pendiente', value: stats.pending, icon: <Clock size={22} />, color: '#ea580c' },
        ].map((item) => <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}><Card sx={{ height: '100%' }}><CardContent><Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box><Typography variant="caption" color="text.secondary" fontWeight={700}>{item.label}</Typography><Typography variant="h5" fontWeight={900}>{money(item.value, currency)}</Typography></CardContent></Card></Grid>)}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}><Card><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Facturado vs. cobrado ({currency})</Typography><Box sx={{ height: 320 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="periodo" /><YAxis /><ChartTooltip formatter={(value) => money(Number(value), currency)} /><Bar dataKey="facturado" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="cobrado" fill="#16a34a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Box></CardContent></Card></Grid>
        <Grid size={{ xs: 12, lg: 5 }}><TableContainer component={Paper}><Table size="small"><TableHead><TableRow><TableCell>Factura</TableCell><TableCell>Compañía</TableCell><TableCell>Estado</TableCell><TableCell align="right">Saldo</TableCell></TableRow></TableHead><TableBody>{filtered.slice(0, 8).map((invoice) => <TableRow key={invoice.id}><TableCell><Typography variant="body2" fontWeight={700}>{invoice.numeroFactura}</Typography><Typography variant="caption">{invoice.periodo}</Typography></TableCell><TableCell>{invoice.insuranceCompany?.razonSocial || '-'}</TableCell><TableCell><Chip size="small" label={STATUS_LABELS[invoice.estadoCalculado]} /></TableCell><TableCell align="right">{money(invoice.saldoPendiente, currency)}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}><Alert severity={snack.severity}>{snack.message}</Alert></Snackbar>
    </Box>
  );
};
