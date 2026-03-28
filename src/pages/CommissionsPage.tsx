import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign, Target, PieChart as PieIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

const data = [
  { name: 'Ene', comision: 45000 },
  { name: 'Feb', comision: 52000 },
  { name: 'Mar', comision: 48000 },
  { name: 'Abr', comision: 61000 },
  { name: 'May', comision: 55000 },
  { name: 'Jun', comision: 67000 },
];

const pieData = [
  { name: 'Automotor', value: 45 },
  { name: 'Hogar', value: 25 },
  { name: 'Vida', value: 15 },
  { name: 'Otros', value: 15 },
];

const COLORS = ['#1a237e', '#00c853', '#ff9100', '#f44336'];

export const CommissionsPage: React.FC = () => {
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
    XLSX.writeFile(wb, "Comisiones_PAS_Alert.xlsx");
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Análisis de Comisiones</Typography>
          <Typography variant="body1" color="text.secondary">Visualiza el rendimiento de tu cartera.</Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<Download size={20} />}
          onClick={handleExport}
        >
          Exportar Excel
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>Comisión Proyectada</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>$ 45.200</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  <DollarSign size={24} />
                </Box>
              </Box>
              <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
                Basado en renovaciones de Marzo 2024
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
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>75%</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'success.light', color: 'success.main', borderRadius: 3 }}>
                  <Target size={24} />
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={75} sx={{ mt: 2, height: 8, borderRadius: 4 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>Promedio por Póliza</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>$ 3.850</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'secondary.light', color: 'secondary.main', borderRadius: 3 }}>
                  <PieIcon size={24} />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                +4.2% respecto al mes anterior
              </Typography>
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
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="comision" fill="#1a237e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Distribución por Rubro</Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {pieData.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[index] }} />
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
                {data.map((row, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>$ { (row.comision * 6.5).toLocaleString() }</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>$ { row.comision.toLocaleString() }</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: index % 2 === 0 ? 'success.main' : 'error.main' }}>
                        {index % 2 === 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {index % 2 === 0 ? '+5.2%' : '-2.1%'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
