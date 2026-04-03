import React, { useState, useEffect } from 'react';
import {
  Grid, Typography, Card, CardContent, Box, LinearProgress, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Alert, CircularProgress, ButtonGroup
} from '@mui/material';
import {
  FileCheck, AlertCircle, Clock, Users, ArrowUpRight, Plus,
  MessageCircle, Edit2, X, Mail, Filter
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon, color, subtitle, onClick, active }: any) => (
  <Card
    sx={{
      height: '100%', position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      border: active ? 2 : 0,
      borderColor: active ? `${color}.main` : 'transparent',
      transition: 'all 0.2s',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {},
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>{title}</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>{value}</Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '50%',
            bgcolor: `${color}.main`,
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { color: 'common.white' }
          }}
        >
          {icon}
        </Box>
      </Box>
      {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>{subtitle}</Typography>}
    </CardContent>
  </Card>
);

const PolicyTable = ({ title, policies, onWhatsApp, onEmail, headerColor = 'secondary.main' }: any) => (
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
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cliente</TableCell>
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
                    {policy.rubro && <Typography variant="caption" display="block" color="text.secondary">{policy.rubro}</Typography>}
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
                    <IconButton size="small" color="primary" onClick={() => onEmail(policy)}>
                      <Mail size={18} />
                    </IconButton>
                    <IconButton size="small" color="info">
                      <Edit2 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {policies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No hay pólizas para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const filter = searchParams.get('filter');

  const [stats, setStats] = useState({ polizasActivas: 0, vencen7Dias: 0, polizasVencidas: 0, clientesTotales: 0 });
  const [policies, setPolicies] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.stats(),
      api.dashboard.policies(filter || undefined),
      api.dashboard.alerts(),
    ]).then(([s, p, a]) => {
      setStats(s);
      setPolicies(p);
      setAlerts(a);
    }).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  const handleWhatsApp = (policy: any) => {
    const pasName = user?.nombre || 'Tu Productor';
    const message = `Hola ${policy.cliente}, te informamos que tu póliza N° ${policy.poliza} vence el día ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}. Por favor, contáctanos para renovarla. Saludos, ${pasName} - AD System.`;
    const phone = policy.telefono ? policy.telefono.replace(/\D/g, '') : '';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleEmail = (policy: any) => {
    const pasName = user?.nombre || 'Tu Productor';
    const subject = `Aviso de vencimiento - Póliza N° ${policy.poliza}`;
    const body = `Hola ${policy.cliente},\n\nTe informamos que tu póliza N° ${policy.poliza} vence el día ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}.\n\nPor favor, contáctanos para renovarla.\n\nSaludos,\n${pasName} - AD System`;
    window.open(`mailto:${policy.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const individualPolicies = policies.filter(p => p.tipo === 'Individual');
  const companyPolicies = policies.filter(p => p.tipo === 'Empresa');
  const lifeFinancePolicies = policies.filter(p => p.rubro === 'Vida' || p.rubro === 'Retiro');

  const applyFilter = (newFilter: string | null) => {
    if (newFilter) {
      navigate(`/?filter=${newFilter}`);
    } else {
      navigate('/');
    }
  };

  const statCards = [
    { title: 'Pólizas Activas', value: stats.polizasActivas, icon: <FileCheck size={24} />, color: 'primary', onClick: () => applyFilter(filter === 'active' ? null : 'active'), active: filter === 'active' },
    { title: 'Vencen en 7 días', value: stats.vencen7Dias, icon: <Clock size={24} />, color: 'warning', subtitle: 'Requieren atención', onClick: () => applyFilter(filter === 'expiring' ? null : 'expiring'), active: filter === 'expiring' },
    { title: 'Pólizas Vencidas', value: stats.polizasVencidas, icon: <AlertCircle size={24} />, color: 'error', subtitle: 'Acción inmediata', onClick: () => applyFilter(filter === 'expired' ? null : 'expired'), active: filter === 'expired' },
    { title: 'Clientes Totales', value: stats.clientesTotales, icon: <Users size={24} />, color: 'info', subtitle: 'Cartera activa' },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>Panel de Control</Typography>
          <Typography variant="body1" color="text.secondary">Bienvenido de nuevo. Aquí tienes un resumen de tu actividad.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {filter && (
            <Button variant="outlined" color="error" startIcon={<X size={20} />} onClick={() => navigate('/')}>
              Quitar Filtro
            </Button>
          )}
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => navigate('/app/polizas')} sx={{ px: 3, py: 1.5, borderRadius: 3 }}>
            Nueva Póliza
          </Button>
        </Box>
      </Box>

      {filter && (
        <Box sx={{ mb: 3 }}>
          <Alert
            severity={filter === 'expired' ? 'error' : filter === 'expiring' ? 'warning' : 'info'}
            sx={{ borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/')}>
                Ver todas
              </Button>
            }
          >
            {filter === 'expiring' && 'Mostrando solo pólizas que vencen en los próximos 7 días.'}
            {filter === 'expired' && 'Mostrando solo pólizas vencidas.'}
            {filter === 'active' && 'Mostrando solo pólizas activas.'}
          </Alert>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 9 }}>
          <PolicyTable title="Pólizas Recientes de Clientes" policies={individualPolicies} onWhatsApp={handleWhatsApp} onEmail={handleEmail} headerColor="primary.main" />
          <PolicyTable title="Pólizas Recientes de Empresas" policies={companyPolicies} onWhatsApp={handleWhatsApp} onEmail={handleEmail} headerColor="secondary.main" />
          {lifeFinancePolicies.length > 0 && (
            <PolicyTable title="Pólizas de Vida y Finanzas" policies={lifeFinancePolicies} onWhatsApp={handleWhatsApp} onEmail={handleEmail} headerColor="error.main" />
          )}
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
                      p: 2, mb: 2, borderRadius: 2,
                      bgcolor: alert.type === 'error' ? 'error.light' : alert.type === 'warning' ? 'warning.light' : 'info.light',
                      color: 'common.white',
                      display: 'flex', gap: 2
                    }}
                  >
                    <Box
                      sx={{
                        mt: 0.25,
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        borderRadius: '50%',
                        bgcolor: alert.type === 'error' ? 'error.main' : alert.type === 'warning' ? 'warning.main' : 'info.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '& svg': { color: 'common.white' }
                      }}
                    >
                      <AlertCircle size={16} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{alert.message}</Typography>
                    </Box>
                  </Box>
                ))}
                {alerts.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No hay alertas nuevas.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Programa de Referidos</Typography>
              <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Users size={32} color="#1a237e" style={{ marginBottom: 8 }} />
                  <Typography variant="body2" gutterBottom>
                    Tienes <strong>{user?.referidosMes || 0} referidos</strong> este mes.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Llega a 10 para obtener el próximo mes 100% bonificado.
                  </Typography>
                  <LinearProgress variant="determinate" value={Math.min(((user?.referidosMes || 0) / 10) * 100, 100)} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{Math.round(((user?.referidosMes || 0) / 10) * 100)}% completado</Typography>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
