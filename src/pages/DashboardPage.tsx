import React from 'react';
import { 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Box, 
  LinearProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import { 
  FileCheck, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Users, 
  ArrowUpRight,
  Plus,
  MessageCircle,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { MOCK_POLICIES } from '../data/mockData';

const StatCard = ({ title, value, icon, color, subtitle }: any) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 3, 
          bgcolor: `${color}.light`, 
          color: `${color}.main`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </Box>
      </Box>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const PolicyTable = ({ title, policies, onWhatsApp, headerColor = 'secondary.main' }: any) => (
  <Card sx={{ mb: 4 }}>
    <CardContent>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Button size="small" endIcon={<ArrowUpRight size={16} />}>Ver todas</Button>
      </Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: headerColor }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>{title.includes('Empresas') ? 'Empresa' : 'Cliente'}</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Vencimiento</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Vigencia</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map((policy: any) => {
              const daysLeft = differenceInDays(parseISO(policy.vencimiento), new Date());
              let color = 'success.main';
              if (daysLeft < 0) color = 'error.main';
              else if (daysLeft <= 5) color = 'warning.main';

              return (
                <TableRow key={policy.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {policy.cliente}
                    {policy.rubro && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {policy.rubro}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{policy.aseguradora}</TableCell>
                  <TableCell>{format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color }}>
                      {daysLeft < 0 ? `Vencida (${daysLeft})` : daysLeft === 0 ? 'Hoy' : `${daysLeft} días`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={policy.estado} 
                      size="small" 
                      color={policy.estado === 'Vencida' ? 'error' : policy.estado === 'Vence pronto' ? 'warning' : 'success'} 
                      variant="outlined" 
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton size="small" color="success" onClick={() => onWhatsApp(policy)}>
                      <MessageCircle size={18} />
                    </IconButton>
                    <IconButton size="small" color="primary">
                      <Edit2 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {policies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                  No hay datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC<{ user?: any }> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filter = searchParams.get('filter');

  const handleWhatsApp = (policy: any) => {
    const pasName = user?.nombre || 'Tu Productor';
    const message = `Hola ${policy.cliente}, te informamos que tu póliza N° ${policy.poliza} vence el día ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}. Por favor, contáctanos para renovarla. Saludos, ${pasName} - PAS Alert.`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  let filteredPolicies = [...MOCK_POLICIES];
  if (filter === 'expiring') {
    filteredPolicies = filteredPolicies.filter(p => {
      const daysLeft = differenceInDays(parseISO(p.vencimiento), new Date());
      return daysLeft >= 0 && daysLeft <= 5;
    });
  }

  const individualPolicies = filteredPolicies.filter(p => p.tipo === 'Individual');
  const companyPolicies = filteredPolicies.filter(p => p.tipo === 'Empresa');
  const lifeFinancePolicies = filteredPolicies.filter(p => p.tipo === 'Vida' || p.tipo === 'Retiro');

  const stats = [
    { title: 'Pólizas Activas', value: '124', icon: <FileCheck size={24} />, color: 'primary', subtitle: '+12 este mes' },
    { title: 'Vencen en 7 días', value: '8', icon: <Clock size={24} />, color: 'warning', subtitle: 'Requieren atención' },
    { title: 'Pólizas Vencidas', value: '3', icon: <AlertCircle size={24} />, color: 'error', subtitle: 'Acción inmediata' },
    { title: 'Clientes Totales', value: '118', icon: <Users size={24} />, color: 'info', subtitle: 'Cartera activa' },
  ];

  const alerts = [
    { id: 1, type: 'warning', message: 'La póliza #4452 de Juan Pérez vence en 3 días.', date: 'Hace 2 horas' },
    { id: 2, type: 'error', message: 'Póliza #9921 de María García ha vencido.', date: 'Hace 5 horas' },
    { id: 3, type: 'info', message: 'Tienes 2 nuevos referidos este mes. ¡Sigue así!', date: 'Ayer' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
            Panel de Control
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bienvenido de nuevo. Aquí tienes un resumen de tu actividad.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {filter === 'expiring' && (
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<X size={20} />}
              onClick={() => navigate('/')}
            >
              Quitar Filtro
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<Plus size={20} />}
            onClick={() => navigate('/polizas')}
            sx={{ px: 3, py: 1.5, borderRadius: 3 }}
          >
            Nueva Póliza
          </Button>
        </Box>
      </Box>

      {filter === 'expiring' && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Mostrando solo pólizas que vencen en los próximos 5 días.
          </Alert>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 9 }}>
          <PolicyTable 
            title="Pólizas Recientes de Clientes" 
            policies={individualPolicies} 
            onWhatsApp={handleWhatsApp} 
            headerColor="primary.main"
          />
          <PolicyTable 
            title="Pólizas Recientes de Empresas" 
            policies={companyPolicies} 
            onWhatsApp={handleWhatsApp} 
            headerColor="secondary.main"
          />
          <PolicyTable 
            title="Pólizas Recientes de Vida y Finanzas" 
            policies={lifeFinancePolicies} 
            onWhatsApp={handleWhatsApp} 
            headerColor="error.main"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: 'fit-content', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Alertas y Notificaciones</Typography>
              <Box sx={{ mt: 2 }}>
                {alerts.map((alert) => (
                  <Box 
                    key={alert.id} 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      borderRadius: 2, 
                      bgcolor: alert.type === 'error' ? 'error.light' : alert.type === 'warning' ? 'warning.light' : 'info.light',
                      color: alert.type === 'error' ? 'error.dark' : alert.type === 'warning' ? 'warning.dark' : 'info.dark',
                      display: 'flex',
                      gap: 2
                    }}
                  >
                    <Box sx={{ mt: 0.5 }}>
                      <AlertCircle size={18} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{alert.message}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>{alert.date}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
          
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Programa de Referidos</Typography>
              <Card variant="outlined" sx={{ bgcolor: 'slate.50', borderStyle: 'dashed' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Users size={32} color="#1a237e" style={{ marginBottom: 8 }} />
                  <Typography variant="body2" gutterBottom>
                    Tienes <strong>2 referidos</strong> este mes.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Llega a 10 para obtener el próximo mes 100% bonificado.
                  </Typography>
                  <LinearProgress variant="determinate" value={20} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>20% completado</Typography>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
