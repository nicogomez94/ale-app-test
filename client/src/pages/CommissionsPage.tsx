import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, CircularProgress, Alert, Snackbar
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign, Target, PieChart as PieIcon, Lock } from 'lucide-react';
import { api } from '../api';

const COLORS = ['#1a237e', '#00c853', '#ff9100', '#f44336', '#9c27b0', '#00bcd4'];

export const CommissionsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([api.commissions.summary(), api.commissions.monthly()]);
      setSummary(s);
      setMonthly(m);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = async () => {
    try {
      const blob = await api.commissions.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Comisiones_PAS_Alert.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnack({ open: true, msg: err.message, severity: 'error' });
    }
  };

  const handleCierreMensual = async () => {
    const now = new Date();
    setClosing(true);
    try {
      await api.commissions.close(now.getMonth() + 1, now.getFullYear());
      setSnack({ open: true, msg: 'Cierre mensual realizado exitosamente.', severity: 'success' });
      fetchData();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message, severity: 'error' });
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const barData = monthly.map((m: any) => ({ name: m.mes, comision: m.comisionBruta }));
  const pieData = summary?.distribucion || [];
  const objetivo = summary?.totalPrima > 0 ? Math.min(100, Math.round((summary.comisionProyectada / summary.totalPrima) * 100)) : 0;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Análisis de Comisiones</Typography>
          <Typography variant="body1" color="text.secondary">Visualiza el rendimiento de tu cartera.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="secondary" onClick={handleCierreMensual} disabled={closing}
            startIcon={<Lock size={20} />}>
            {closing ? 'Cerrando...' : 'Cierre Mensual'}
          </Button>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>
            Exportar Excel
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>Comisión Proyectada</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>$ {(summary?.comisionProyectada || 0).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  <DollarSign size={24} />
                </Box>
              </Box>
              <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
                Basado en pólizas activas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>Objetivo Mensual</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>{objetivo}%</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'success.light', color: 'success.main', borderRadius: 3 }}>
                  <Target size={24} />
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={objetivo} sx={{ mt: 2, height: 8, borderRadius: 4 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>Promedio por Póliza</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>$ {(summary?.promedioPoliza || 0).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'secondary.light', color: 'secondary.main', borderRadius: 3 }}>
                  <PieIcon size={24} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Evolución Mensual</Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="comision" fill="#1a237e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                    <Typography>Realiza un cierre mensual para ver la evolución.</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Distribución por Rubro</Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                    <Typography variant="body2">Sin datos de distribución.</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ mt: 2 }}>
                {pieData.map((item: any, index: number) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[index % COLORS.length] }} />
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.value}%</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Detalle de Comisiones</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'slate.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Mes</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total Prima</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Comisión Bruta</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Crecimiento</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthly.length > 0 ? monthly.map((row: any, index: number) => (
                  <TableRow key={index} hover>
                    <TableCell>{row.mes}</TableCell>
                    <TableCell>$ {row.totalPrima.toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>$ {row.comisionBruta.toLocaleString()}</TableCell>
                    <TableCell>
                      {row.crecimiento !== null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: row.crecimiento >= 0 ? 'success.main' : 'error.main' }}>
                          {row.crecimiento >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {row.crecimiento >= 0 ? '+' : ''}{row.crecimiento.toFixed(1)}%
                        </Box>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
                      No hay cierres realizados. Usa el botón "Cierre Mensual" para generar el primer cierre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};
