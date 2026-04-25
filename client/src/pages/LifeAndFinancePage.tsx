import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Tabs, Tab, CircularProgress
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, HeartPulse, Download, MessageCircle, Mail, Coins } from 'lucide-react';
import { api } from '../api';
import { DEBUG, debugData } from '../data/debugData';

const LIFE_TYPES = [
  { label: 'Seguros de Vida', icon: <HeartPulse size={18} />, value: 'VIDA' },
  { label: 'Seguros de Retiro', icon: <Coins size={18} />, value: 'RETIRO' },
];

export const LifeAndFinancePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<Record<string, any>>({});

  const currentType = LIFE_TYPES[tab].value;

  const loadPolicies = async () => {
    try {
      const data = await api.lifePolicies.list(currentType, searchTerm || undefined);
      setPolicies(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); loadPolicies(); }, [tab, searchTerm]);

  const handleOpen = (policy?: any) => {
    setEditingPolicy(policy || null);
    formRef.current = policy
      ? { ...policy }
      : DEBUG ? { ...debugData.lifePolicy[currentType as 'VIDA' | 'RETIRO'], tipo: currentType } : { tipo: currentType };
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditingPolicy(null); };

  const handleSave = async () => {
    try {
      const data = { ...formRef.current, tipo: formRef.current.tipo || currentType };
      if (editingPolicy) {
        await api.lifePolicies.update(editingPolicy.id, data);
      } else {
        await api.lifePolicies.create(data);
      }
      handleClose();
      loadPolicies();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta póliza?')) return;
    try { await api.lifePolicies.delete(id); loadPolicies(); }
    catch (err: any) { alert(err.message); }
  };

  const handleWhatsApp = (telefono: string) => {
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}`, '_blank');
  };

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`);
  };

  const handleExport = async () => {
    try {
      const blob = await api.lifePolicies.export(currentType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vida_Finanzas_${LIFE_TYPES[tab].label}_PAS_Alert.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Vida y Finanzas</Typography>
          <Typography variant="body1" color="text.secondary">Gestiona pólizas de Vida y Seguros de Retiro.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>Exportar Excel</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => handleOpen()} sx={{ borderRadius: 3, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}>Nueva Póliza</Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {LIFE_TYPES.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
        </Tabs>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField fullWidth placeholder="Buscar por cliente o CUIT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: 'error.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cliente</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>CUIT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                  {currentType === 'VIDA' ? 'Suma Asegurada' : 'Aporte Mensual'}
                </TableCell>
                {currentType === 'RETIRO' && <TableCell sx={{ color: 'white', fontWeight: 700 }}>Fondo Acumulado</TableCell>}
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{policy.cliente}</TableCell>
                  <TableCell>{policy.cuit}</TableCell>
                  <TableCell>{policy.aseguradora}</TableCell>
                  <TableCell>
                    {currentType === 'VIDA' ? `$${policy.sumaAsegurada?.toLocaleString() || 0}` : `$${policy.aporteMensual?.toLocaleString() || 0}`}
                  </TableCell>
                  {currentType === 'RETIRO' && (
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>${policy.fondoAcumulado?.toLocaleString() || 0}</TableCell>
                  )}
                  <TableCell>{policy.email}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton color="success" onClick={() => handleWhatsApp(policy.telefono || '')}><MessageCircle size={18} /></IconButton>
                    <IconButton color="info" onClick={() => handleEmailClick(policy.email || '')}><Mail size={18} /></IconButton>
                    <IconButton color="primary" onClick={() => handleOpen(policy)}><Edit2 size={18} /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(policy.id)}><Trash2 size={18} /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {policies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={currentType === 'RETIRO' ? 7 : 6} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                    No hay datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingPolicy ? 'Editar Póliza' : `Nueva Póliza (${LIFE_TYPES[tab].label})`}</DialogTitle>
        <DialogContent>
          {(() => {
            const d = editingPolicy ?? (DEBUG ? debugData.lifePolicy[currentType as 'VIDA' | 'RETIRO'] : {}) as any;
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 8 }}><TextField key={open + 'cli'} fullWidth label="Nombre del Cliente" defaultValue={d.cliente} onChange={(e) => formRef.current.cliente = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'cuit'} fullWidth label="CUIT" defaultValue={d.cuit} onChange={(e) => formRef.current.cuit = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'aseg'} fullWidth label="Aseguradora" defaultValue={d.aseguradora} onChange={(e) => formRef.current.aseguradora = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField key={open + 'monto'} fullWidth label={currentType === 'VIDA' ? 'Suma Asegurada' : 'Aporte Mensual'} type="number"
                    defaultValue={currentType === 'VIDA' ? (d.sumaAsegurada) : (d.aporteMensual)}
                    onChange={(e) => { if (currentType === 'VIDA') formRef.current.sumaAsegurada = e.target.value; else formRef.current.aporteMensual = e.target.value; }}
                  />
                </Grid>
                {currentType === 'RETIRO' && (
                  <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'fondo'} fullWidth label="Fondo Acumulado" type="number" defaultValue={d.fondoAcumulado} onChange={(e) => formRef.current.fondoAcumulado = e.target.value} /></Grid>
                )}
                {currentType === 'VIDA' && (
                  <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'prima'} fullWidth label="Prima Mensual" type="number" defaultValue={d.prima} onChange={(e) => formRef.current.prima = e.target.value} /></Grid>
                )}
                <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'email'} fullWidth label="Email" defaultValue={d.email} onChange={(e) => formRef.current.email = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'tel'} fullWidth label="Teléfono" defaultValue={d.telefono} onChange={(e) => formRef.current.telefono = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 3 }}><TextField key={open + 'cp'} fullWidth label="Código Postal" defaultValue={d.cp} onChange={(e) => formRef.current.cp = e.target.value} /></Grid>
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleSave}>Guardar Póliza</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
