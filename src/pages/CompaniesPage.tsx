import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
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
  IconButton, 
  TextField, 
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Building2, 
  Download,
  Phone,
  Mail,
  MessageCircle,
  Users,
  Truck,
  Shield,
  Briefcase,
  Home,
  Store
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';

export const CompaniesPage: React.FC = () => {
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  React.useEffect(() => {
    if (location.state?.openNew) {
      handleOpen();
      // Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [companies, setCompanies] = useState([
    { id: '1', razonSocial: 'Tech Solutions S.A.', cuit: '30-12345678-9', empleados: 45, aseguradora: 'Prevención ART', email: 'rrhh@techsolutions.com', telefono: '1144556677', direccion: 'Av. Libertador 1000', cp: '1425', ramo: 'Tecnología', tipo: 'ART' },
    { id: '2', razonSocial: 'Logística Express', cuit: '30-98765432-1', empleados: 120, aseguradora: 'Experta ART', email: 'info@logistica.com', telefono: '1122334455', direccion: 'Ruta 8 Km 50', cp: '1629', ramo: 'Transporte', tipo: 'ART' },
    { id: '3', razonSocial: 'Distribuidora Norte', cuit: '30-11223344-5', vehiculos: 12, aseguradora: 'Sancor Seguros', email: 'flota@distnorte.com', telefono: '1155667788', direccion: 'Pueyrredón 450', cp: '1032', ramo: 'Distribución', tipo: 'Flotas' },
    { id: '4', razonSocial: 'Fábrica Textil S.R.L.', cuit: '30-55667788-2', aseguradora: 'Allianz', email: 'ventas@textil.com', telefono: '1166778899', direccion: 'Warnes 1200', cp: '1414', ramo: 'Textil', tipo: 'TRO' },
    { id: '5', razonSocial: 'Edificio Sol Naciente', cuit: '30-99887766-4', aseguradora: 'Sancor Seguros', email: 'admin@solnaciente.com', telefono: '1133445566', direccion: 'Av. Santa Fe 2500', cp: '1425', ramo: 'Inmobiliario', tipo: 'Consorcio' },
    { id: '6', razonSocial: 'Supermercado Don Juan', cuit: '30-22334455-1', aseguradora: 'La Segunda', email: 'donjuan@gmail.com', telefono: '1177889900', direccion: 'Belgrano 300', cp: '1001', ramo: 'Retail', tipo: 'Integral de Comercio' },
  ]);

  const tabs = [
    { label: 'ART', icon: <Shield size={18} />, value: 'ART' },
    { label: 'Flotas', icon: <Truck size={18} />, value: 'Flotas' },
    { label: 'TRO', icon: <Briefcase size={18} />, value: 'TRO' },
    { label: 'Consorcio', icon: <Home size={18} />, value: 'Consorcio' },
    { label: 'Integral de Comercio', icon: <Store size={18} />, value: 'Integral de Comercio' },
  ];

  const handleOpen = (company?: any) => {
    setEditingCompany(company || null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCompany(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta empresa?')) {
      setCompanies(companies.filter(c => c.id !== id));
    }
  };

  const handleWhatsApp = (telefono: string) => {
    const url = `https://wa.me/${telefono.replace(/\D/g, '')}`;
    window.open(url, '_blank');
  };

  const handleExport = () => {
    const currentType = tabs[tab].value;
    const data = companies.filter(c => c.tipo === currentType);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentType);
    XLSX.writeFile(wb, `Empresas_${currentType}_PAS_Alert.xlsx`);
  };

  const currentType = tabs[tab].value;
  const filteredCompanies = companies.filter(c => 
    c.tipo === currentType && (
      c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.cuit.includes(searchTerm)
    )
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Gestión de Empresas</Typography>
          <Typography variant="body1" color="text.secondary">Administra ART, Flotas, TRO, Consorcios e Integrales.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Download size={20} />}
            onClick={handleExport}
          >
            Exportar Excel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Plus size={20} />}
            onClick={() => handleOpen()}
            sx={{ borderRadius: 3 }}
          >
            Nueva Empresa
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tab} 
          onChange={(_, newValue) => setTab(newValue)} 
          variant="scrollable"
          scrollButtons="auto"
          aria-label="tabs empresas"
        >
          {tabs.map((t, index) => (
            <Tab key={index} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Buscar por razón social o CUIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'secondary.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Razón Social</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Rubro / Actividad</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CUIT</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                {currentType === 'ART' ? 'Empleados' : currentType === 'Flotas' ? 'Vehículos' : 'Detalle'}
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>C.P.</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{company.razonSocial}</TableCell>
                <TableCell>
                  <Chip label={company.ramo} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                </TableCell>
                <TableCell>{company.cuit}</TableCell>
                <TableCell>
                  {(company as any).empleados || (company as any).vehiculos ? (
                    <Chip 
                      label={(company as any).empleados || (company as any).vehiculos} 
                      size="small" 
                      variant="outlined"
                      icon={currentType === 'ART' ? <Users size={14} /> : <Truck size={14} />}
                    />
                  ) : '-'}
                </TableCell>
                <TableCell>{company.aseguradora}</TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.cp}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton color="success" onClick={() => handleWhatsApp(company.telefono)}>
                    <MessageCircle size={18} />
                  </IconButton>
                  <IconButton color="primary" onClick={() => handleOpen(company)}>
                    <Edit2 size={18} />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(company.id)}>
                    <Trash2 size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCompany ? 'Editar Empresa' : `Nueva Empresa (${currentType})`}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label="Razón Social" defaultValue={editingCompany?.razonSocial} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="CUIT" defaultValue={editingCompany?.cuit} />
            </Grid>
            {(currentType === 'ART' || currentType === 'Flotas') && (
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField 
                  fullWidth 
                  label={currentType === 'ART' ? "Cantidad de Empleados" : "Cantidad de Vehículos"} 
                  type="number"
                  defaultValue={currentType === 'ART' ? (editingCompany as any)?.empleados : (editingCompany as any)?.vehiculos} 
                />
              </Grid>
            )}
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField fullWidth label="Aseguradora" defaultValue={editingCompany?.aseguradora} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Rubro / Actividad" defaultValue={editingCompany?.ramo} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Email" defaultValue={editingCompany?.email} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Teléfono" defaultValue={editingCompany?.telefono} />
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <TextField fullWidth label="Dirección" defaultValue={editingCompany?.direccion} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Código Postal" defaultValue={editingCompany?.cp} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleClose}>Guardar Empresa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
