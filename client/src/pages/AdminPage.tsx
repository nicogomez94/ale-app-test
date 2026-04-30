import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment,
  Chip, IconButton, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Button, Snackbar, Alert, CircularProgress,
  Divider, Tooltip,
} from '@mui/material';
import { Search, Users, Shield, FileText, Building2, Trash2, FlaskConical, Play } from 'lucide-react';
import { api } from '../api';

interface AdminStats {
  totalUsuarios: number;
  activos: number;
  inactivos: number;
  porPlan: Record<string, number>;
  totalPolizas: number;
  totalClientes: number;
  totalEmpresas: number;
}

interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  plan: string;
  estado: string;
  isAdmin: boolean;
  planVencimiento: string | null;
  trialFin: string | null;
  lastLogin: string | null;
  createdAt: string;
  _count: { polizas: number; clientes: number; empresas: number };
}

const planColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
  TRIAL: 'default',
  EMPRENDEDOR: 'info',
  PROFESIONAL: 'success',
  AGENCIA: 'warning',
};

const estadoColors: Record<string, 'success' | 'error'> = {
  ACTIVO: 'success',
  INACTIVO: 'error',
};

export const AdminPage = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<AdminUser | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Testing Lab state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [jobLoading, setJobLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        api.admin.stats(),
        api.admin.users(search || undefined),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChangePlan = async (userId: string, plan: string) => {
    try {
      await api.admin.updateUser(userId, { plan });
      setSnackbar({ open: true, message: 'Plan actualizado', severity: 'success' });
      loadData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleToggleEstado = async (user: AdminUser) => {
    try {
      const nuevoEstado = user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await api.admin.updateUser(user.id, { estado: nuevoEstado });
      setSnackbar({ open: true, message: `Usuario ${nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado'}`, severity: 'success' });
      loadData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await api.admin.deleteUser(deleteDialog.id);
      setSnackbar({ open: true, message: 'Usuario eliminado', severity: 'success' });
      setDeleteDialog(null);
      loadData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleRunJobs = async () => {
    setJobLoading(true);
    try {
      const res = await api.admin.runJobs();
      setSnackbar({ open: true, message: `Jobs ejecutados: ${JSON.stringify(res.results)}`, severity: 'success' });
      loadData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setJobLoading(false);
    }
  };

  const handleTestSeed = async (scenario: string) => {
    if (!selectedUserId) {
      setSnackbar({ open: true, message: 'Seleccioná un usuario primero', severity: 'error' });
      return;
    }
    setSeedLoading(scenario);
    try {
      const res = await api.admin.testSeed(selectedUserId, scenario);
      setSnackbar({ open: true, message: res.message || 'Escenario aplicado', severity: 'success' });
      loadData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setSeedLoading('');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        <Shield size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Panel de Administración
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Usuarios', value: stats?.totalUsuarios ?? 0, icon: <Users size={28} />, color: '#1a237e' },
          { label: 'Usuarios Activos', value: stats?.activos ?? 0, icon: <Users size={28} />, color: '#2e7d32' },
          { label: 'Total Pólizas', value: stats?.totalPolizas ?? 0, icon: <FileText size={28} />, color: '#f57c00' },
          { label: 'Total Empresas', value: stats?.totalEmpresas ?? 0, icon: <Building2 size={28} />, color: '#7b1fa2' },
        ].map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 52, height: 52, borderRadius: 3, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  bgcolor: `${card.color}15`, color: card.color,
                }}>
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>{card.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Plan distribution */}
      {stats?.porPlan && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {Object.entries(stats.porPlan).map(([plan, count]) => (
            <Chip
              key={plan}
              label={`${plan}: ${count}`}
              color={planColors[plan] || 'default'}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      )}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><Search size={20} /></InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Testing Lab */}
      <Card sx={{ borderRadius: 3, mb: 4, border: '1.5px dashed', borderColor: 'warning.main', bgcolor: 'warning.50' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FlaskConical size={20} color="#ed6c02" />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.dark' }}>
              Laboratorio de Testing
            </Typography>
            <Chip label="Solo admins" size="small" color="warning" sx={{ ml: 1 }} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Modificá fechas y estados en la DB para simular escenarios sin esperar. Después usá "Ejecutar Jobs" para ver el resultado.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* Run Jobs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={jobLoading ? <CircularProgress size={16} color="inherit" /> : <Play size={16} />}
              onClick={handleRunJobs}
              disabled={jobLoading}
            >
              Ejecutar Jobs Ahora
            </Button>
            <Typography variant="caption" color="text.secondary">
              Corre actualización de estados de pólizas, reset de referidos y envío de recordatorios.
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* User selector + scenarios */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Simular escenario para usuario:</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              size="small"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              displayEmpty
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="" disabled>Seleccionar usuario...</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.nombre} ({u.email})</MenuItem>
              ))}
            </Select>
          </Box>

          {[
            { scenario: 'expiring_1d', label: 'Suscripción vence en 1 día', color: 'error' as const },
            { scenario: 'expiring_3d', label: 'Suscripción vence en 3 días', color: 'warning' as const },
            { scenario: 'expired', label: 'Suscripción vencida', color: 'error' as const },
            { scenario: 'day1_referrals', label: 'Simular día 1 (reset referidos)', color: 'info' as const },
            { scenario: 'policy_vencida', label: 'Póliza vencida', color: 'error' as const },
            { scenario: 'policy_vence_pronto', label: 'Póliza vence pronto (3 días)', color: 'warning' as const },
          ].map(({ scenario, label, color }) => (
            <Tooltip key={scenario} title={!selectedUserId ? 'Seleccioná un usuario primero' : ''}>
              <span>
                <Button
                  key={scenario}
                  variant="outlined"
                  color={color}
                  size="small"
                  sx={{ mt: 1, mr: 1 }}
                  disabled={!selectedUserId || seedLoading === scenario}
                  startIcon={seedLoading === scenario ? <CircularProgress size={14} color="inherit" /> : null}
                  onClick={() => handleTestSeed(scenario)}
                >
                  {label}
                </Button>
              </span>
            </Tooltip>
          ))}
        </CardContent>
      </Card>

      {/* Users Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Nombre', 'Email', 'Plan', 'Estado', 'Pólizas', 'Clientes', 'Último Login', 'Registro', 'Acciones'].map((h) => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {u.nombre}
                    {u.isAdmin && <Chip label="Admin" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />}
                  </Box>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={u.plan}
                    onChange={(e) => handleChangePlan(u.id, e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="TRIAL">Trial</MenuItem>
                    <MenuItem value="EMPRENDEDOR">Emprendedor</MenuItem>
                    <MenuItem value="PROFESIONAL">Profesional</MenuItem>
                    <MenuItem value="AGENCIA">Agencia</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.estado}
                    color={estadoColors[u.estado] || 'default'}
                    size="small"
                    onClick={() => handleToggleEstado(u)}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>{u._count.polizas}</TableCell>
                <TableCell>{u._count.clientes}</TableCell>
                <TableCell>{formatDate(u.lastLogin)}</TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => setDeleteDialog(u)}
                    disabled={u.isAdmin}
                    title={u.isAdmin ? 'No se puede eliminar un admin' : 'Eliminar usuario'}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary', fontWeight: 600 }}>
                  No hay datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Eliminar Usuario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que querés eliminar a <strong>{deleteDialog?.nombre}</strong> ({deleteDialog?.email})?
            Esto eliminará todas sus pólizas, clientes y datos asociados. Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
