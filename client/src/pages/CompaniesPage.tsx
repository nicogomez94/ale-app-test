import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Tabs, Tab, Chip, CircularProgress
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, Building2, Download, MessageCircle, Mail, Users, Truck, Shield, Briefcase, Home, Store } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

const COMPANY_TYPES = [
  { label: 'ART', icon: <Shield size={18} />, value: 'ART' },
  { label: 'Flotas', icon: <Truck size={18} />, value: 'FLOTAS' },
  { label: 'TRO', icon: <Briefcase size={18} />, value: 'TRO' },
  { label: 'Consorcio', icon: <Home size={18} />, value: 'CONSORCIO' },
  { label: 'Integral de Comercio', icon: <Store size={18} />, value: 'INTEGRAL_DE_COMERCIO' },
];

export const CompaniesPage: React.FC = () => {
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<Record<string, any>>({});

  const currentType = COMPANY_TYPES[tab].value;

  const loadCompanies = async () => {
    try {
      const data = await api.companies.list(currentType, searchTerm || undefined);
      setCompanies(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); loadCompanies(); }, [tab, searchTerm]);

  useEffect(() => {
    if (location.state?.openNew) {
      handleOpen();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleOpen = (company?: any) => {
    setEditingCompany(company || null);
    formRef.current = company ? { ...company } : { tipo: currentType };
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditingCompany(null); };

  const handleSave = async () => {
    try {
      const data = { ...formRef.current, tipo: formRef.current.tipo || currentType };
      if (editingCompany) {
        await api.companies.update(editingCompany.id, data);
      } else {
        await api.companies.create(data);
      }
      handleClose();
      loadCompanies();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta empresa?')) return;
    try { await api.companies.delete(id); loadCompanies(); }
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
      const blob = await api.companies.export(currentType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Empresas_${COMPANY_TYPES[tab].label}_PAS_Alert.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Gestión de Empresas</Typography>
          <Typography variant="body1" color="text.secondary">Administra ART, Flotas, TRO, Consorcios e Integrales.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>Exportar Excel</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => handleOpen()} sx={{ borderRadius: 3 }}>Nueva Empresa</Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {COMPANY_TYPES.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
        </Tabs>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField fullWidth placeholder="Buscar por razón social o CUIT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: 'secondary.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Razón Social</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Rubro / Actividad</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>CUIT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                  {currentType === 'ART' ? 'Empleados' : currentType === 'FLOTAS' ? 'Vehículos' : 'Detalle'}
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>C.P.</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{company.razonSocial}</TableCell>
                  <TableCell><Chip label={company.ramo || '-'} size="small" variant="outlined" sx={{ fontWeight: 600 }} /></TableCell>
                  <TableCell>{company.cuit}</TableCell>
                  <TableCell>
                    {company.empleados || company.vehiculos ? (
                      <Chip label={company.empleados || company.vehiculos} size="small" variant="outlined"
                        icon={currentType === 'ART' ? <Users size={14} /> : <Truck size={14} />} />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{company.aseguradora}</TableCell>
                  <TableCell>{company.email}</TableCell>
                  <TableCell>{company.cp}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton color="success" onClick={() => handleWhatsApp(company.telefono)}><MessageCircle size={18} /></IconButton>
                    <IconButton color="info" onClick={() => handleEmailClick(company.email)}><Mail size={18} /></IconButton>
                    <IconButton color="primary" onClick={() => handleOpen(company)}><Edit2 size={18} /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(company.id)}><Trash2 size={18} /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingCompany ? 'Editar Empresa' : `Nueva Empresa (${COMPANY_TYPES[tab].label})`}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}><TextField fullWidth label="Razón Social" defaultValue={editingCompany?.razonSocial} onChange={(e) => formRef.current.razonSocial = e.target.value} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="CUIT" defaultValue={editingCompany?.cuit} onChange={(e) => formRef.current.cuit = e.target.value} /></Grid>
            {(currentType === 'ART' || currentType === 'FLOTAS') && (
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth label={currentType === 'ART' ? "Cantidad de Empleados" : "Cantidad de Vehículos"} type="number"
                  defaultValue={currentType === 'ART' ? editingCompany?.empleados : editingCompany?.vehiculos}
                  onChange={(e) => { if (currentType === 'ART') formRef.current.empleados = e.target.value; else formRef.current.vehiculos = e.target.value; }}
                />
              </Grid>
            )}
            <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth label="Aseguradora" defaultValue={editingCompany?.aseguradora} onChange={(e) => formRef.current.aseguradora = e.target.value} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Rubro / Actividad" defaultValue={editingCompany?.ramo} onChange={(e) => formRef.current.ramo = e.target.value} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Email" defaultValue={editingCompany?.email} onChange={(e) => formRef.current.email = e.target.value} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Teléfono" defaultValue={editingCompany?.telefono} onChange={(e) => formRef.current.telefono = e.target.value} /></Grid>
            <Grid size={{ xs: 12, md: 9 }}><TextField fullWidth label="Dirección" defaultValue={editingCompany?.direccion} onChange={(e) => formRef.current.direccion = e.target.value} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Código Postal" defaultValue={editingCompany?.cp} onChange={(e) => formRef.current.cp = e.target.value} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar Empresa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
