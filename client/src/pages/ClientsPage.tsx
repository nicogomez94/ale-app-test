import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Menu, MenuItem, CircularProgress
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, Download, MessageCircle, Building2, User, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DEBUG, debugData } from '../data/debugData';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<Record<string, string>>({});

  const loadClients = async () => {
    try {
      const data = await api.clients.list(searchTerm || undefined);
      setClients(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadClients(); }, [searchTerm]);

  const handleOpen = (client?: any) => {
    setEditingClient(client || null);
    formRef.current = client
      ? { nombre: client.nombre, dni: client.dni, telefono: client.telefono, email: client.email, direccion: client.direccion || '', cp: client.cp || '' }
      : DEBUG ? { ...debugData.client } : {};
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditingClient(null); };

  const handleSave = async () => {
    try {
      if (editingClient) {
        await api.clients.update(editingClient.id, formRef.current);
      } else {
        await api.clients.create(formRef.current);
      }
      handleClose();
      loadClients();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    try { await api.clients.delete(id); loadClients(); }
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
      const blob = await api.clients.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Clientes_PAS_Alert.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Gestión de Clientes</Typography>
          <Typography variant="body1" color="text.secondary">Administra tu cartera de clientes individuales.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>Exportar Excel</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ borderRadius: 3 }}>Nuevo...</Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => { setAnchorEl(null); handleOpen(); }} sx={{ gap: 1.5 }}><User size={18} />Nuevo Cliente (Individuo)</MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/app/empresas', { state: { openNew: true } }); }} sx={{ gap: 1.5 }}><Building2 size={18} />Nueva Empresa</MenuItem>
          </Menu>
        </Box>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField fullWidth placeholder="Buscar por nombre o DNI..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Nombre</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>DNI</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Teléfono</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>C.P.</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{client.nombre}</TableCell>
                <TableCell>{client.dni}</TableCell>
                <TableCell>{client.telefono}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.cp}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton color="success" onClick={() => handleWhatsApp(client.telefono)}><MessageCircle size={18} /></IconButton>
                  <IconButton color="info" onClick={() => handleEmailClick(client.email)}><Mail size={18} /></IconButton>
                  <IconButton color="primary" onClick={() => handleOpen(client)}><Edit2 size={18} /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(client.id)}><Trash2 size={18} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        <DialogContent>
          {(() => {
            const d = editingClient ?? (DEBUG ? debugData.client : {}) as any;
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}><TextField key={open + 'nombre'} fullWidth label="Nombre Completo" defaultValue={d.nombre} onChange={(e) => formRef.current.nombre = e.target.value} /></Grid>
                <Grid size={{ xs: 6 }}><TextField key={open + 'dni'} fullWidth label="DNI" defaultValue={d.dni} onChange={(e) => formRef.current.dni = e.target.value} /></Grid>
                <Grid size={{ xs: 6 }}><TextField key={open + 'tel'} fullWidth label="Teléfono" defaultValue={d.telefono} onChange={(e) => formRef.current.telefono = e.target.value} /></Grid>
                <Grid size={{ xs: 12 }}><TextField key={open + 'email'} fullWidth label="Email" defaultValue={d.email} onChange={(e) => formRef.current.email = e.target.value} /></Grid>
                <Grid size={{ xs: 8 }}><TextField key={open + 'dir'} fullWidth label="Dirección" defaultValue={d.direccion} onChange={(e) => formRef.current.direccion = e.target.value} /></Grid>
                <Grid size={{ xs: 4 }}><TextField key={open + 'cp'} fullWidth label="Código Postal" defaultValue={d.cp} onChange={(e) => formRef.current.cp = e.target.value} /></Grid>
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar Cliente</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
