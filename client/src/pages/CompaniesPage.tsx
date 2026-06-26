import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Tabs, Tab, Chip, CircularProgress
} from '@mui/material';
import { Plus, Search, Building2, Download, Users, Truck, Shield, Briefcase, Home, Store } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DEBUG, debugData } from '../data/debugData';
import { ListingActions } from '../components/ListingActions';

const COMPANY_TYPES = [
  { label: 'ART', icon: <Shield size={18} />, value: 'ART' },
  { label: 'Flotas', icon: <Truck size={18} />, value: 'FLOTAS' },
  { label: 'TRO', icon: <Briefcase size={18} />, value: 'TRO' },
  { label: 'Consorcio', icon: <Home size={18} />, value: 'CONSORCIO' },
  { label: 'Integral de Comercio', icon: <Store size={18} />, value: 'INTEGRAL_DE_COMERCIO' },
];

export const CompaniesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
    formRef.current = company
      ? { ...company }
      : DEBUG ? { ...debugData.company, tipo: currentType } : { tipo: currentType };
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
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{
        mb: 4,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-start' },
        gap: 2,
        minWidth: 0,
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>Gestión de Empresas</Typography>
          <Typography variant="body1" color="text.secondary">Administra ART, Flotas, TRO, Consorcios e Integrales.</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, max-content)' }, gap: 1.5, justifyContent: { xs: 'stretch', md: 'flex-end' }, minWidth: 0 }}>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport} sx={{ minWidth: 0, whiteSpace: 'normal', lineHeight: 1.25 }}>Exportar Excel</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => navigate('/polizas', { state: { policyMode: 'EMPRESA', lockPolicyMode: true } })} sx={{ minWidth: 0, whiteSpace: 'normal', lineHeight: 1.25, borderRadius: 3 }}>Nueva Póliza</Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => handleOpen()} sx={{ minWidth: 0, whiteSpace: 'normal', lineHeight: 1.25, borderRadius: 3 }}>Nueva Empresa</Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, minWidth: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {COMPANY_TYPES.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
        </Tabs>
      </Box>

      <Card sx={{ mb: 4, minWidth: 0 }}>
        <CardContent>
          <TextField fullWidth placeholder="Buscar por razón social o CUIT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1240 }}>
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
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Localidad</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Provincia</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Pólizas activas</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right', minWidth: 220 }}>Acciones</TableCell>
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
                  <TableCell>{company.localidad || '-'}</TableCell>
                  <TableCell>{company.provincia || '-'}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(company.polizasActivas || []).length > 0 ? company.polizasActivas.slice(0, 3).map((policy: any) => (
                        <Chip key={policy.id} label={`${policy.numeroPoliza} · ${policy.aseguradora}`} size="small" variant="outlined" />
                      )) : <Typography variant="body2" color="text.secondary">Sin pólizas activas</Typography>}
                      {(company.polizasActivas || []).length > 3 && <Chip label={`+${company.polizasActivas.length - 3}`} size="small" />}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', minWidth: 220 }}>
                    <ListingActions
                      onWhatsApp={() => handleWhatsApp(company.telefono)}
                      onEmail={() => handleEmailClick(company.email)}
                      onEdit={() => handleOpen(company)}
                      onDelete={() => handleDelete(company.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                    No hay datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingCompany ? 'Editar Empresa' : `Nueva Empresa (${COMPANY_TYPES[tab].label})`}</DialogTitle>
        <DialogContent>
          {(() => {
            const d = editingCompany ?? (DEBUG ? debugData.company : {}) as any;
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 8 }}><TextField key={open + 'rs'} fullWidth label="Razón Social" defaultValue={d.razonSocial} onChange={(e) => formRef.current.razonSocial = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'cuit'} fullWidth label="CUIT" defaultValue={d.cuit} onChange={(e) => formRef.current.cuit = e.target.value} /></Grid>
                {(currentType === 'ART' || currentType === 'FLOTAS') && (
                  <Grid size={{ xs: 6, md: 4 }}>
                    <TextField key={open + 'cant'} fullWidth label={currentType === 'ART' ? 'Cantidad de Empleados' : 'Cantidad de Vehículos'} type="number"
                      defaultValue={currentType === 'ART' ? (d.empleados ?? d.cantidadEmpleados) : (d.vehiculos ?? d.cantidadVehiculos)}
                      onChange={(e) => { if (currentType === 'ART') formRef.current.empleados = e.target.value; else formRef.current.vehiculos = e.target.value; }}
                    />
                  </Grid>
                )}
                <Grid size={{ xs: 6, md: 4 }}><TextField key={open + 'aseg'} fullWidth label="Aseguradora" defaultValue={d.aseguradora} onChange={(e) => formRef.current.aseguradora = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'ramo'} fullWidth label="Rubro / Actividad" defaultValue={d.ramo} onChange={(e) => formRef.current.ramo = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'email'} fullWidth label="Email" defaultValue={d.email} onChange={(e) => formRef.current.email = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><TextField key={open + 'tel'} fullWidth label="Teléfono" defaultValue={d.telefono} onChange={(e) => formRef.current.telefono = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 8 }}><TextField key={open + 'dir'} fullWidth label="Dirección" defaultValue={d.direccion} onChange={(e) => formRef.current.direccion = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'altura'} fullWidth label="N°" defaultValue={d.altura} onChange={(e) => formRef.current.altura = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'cp'} fullWidth label="Código Postal" defaultValue={d.cp} onChange={(e) => formRef.current.cp = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'loc'} fullWidth label="Localidad" defaultValue={d.localidad} onChange={(e) => formRef.current.localidad = e.target.value} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><TextField key={open + 'prov'} fullWidth label="Provincia" defaultValue={d.provincia} onChange={(e) => formRef.current.provincia = e.target.value} /></Grid>
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar Empresa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
