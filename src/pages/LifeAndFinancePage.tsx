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
  HeartPulse, 
  Download,
  Phone,
  Mail,
  MessageCircle,
  Users,
  TrendingUp,
  Shield,
  Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const LifeAndFinancePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  const [policies, setPolicies] = useState([
    { id: '1', cliente: 'Juan Pérez', cuit: '20-12345678-9', aseguradora: 'Zurich', tipo: 'Vida', sumaAsegurada: 5000000, prima: 1500, email: 'juan.perez@gmail.com', telefono: '1144556677', cp: '1425' },
    { id: '2', cliente: 'María García', cuit: '27-98765432-1', aseguradora: 'Sancor Seguros', tipo: 'Retiro', aporteMensual: 2500, fondoAcumulado: 450000, email: 'm.garcia@outlook.com', telefono: '1122334455', cp: '1629' },
    { id: '3', cliente: 'Carlos López', cuit: '20-11223344-5', aseguradora: 'Galicia Seguros', tipo: 'Vida', sumaAsegurada: 3000000, prima: 900, email: 'clopez@yahoo.com', telefono: '1155667788', cp: '1032' },
  ]);

  const tabs = [
    { label: 'Seguros de Vida', icon: <HeartPulse size={18} />, value: 'Vida' },
    { label: 'Seguros de Retiro', icon: <Coins size={18} />, value: 'Retiro' },
  ];

  const handleOpen = (policy?: any) => {
    setEditingPolicy(policy || null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPolicy(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta póliza?')) {
      setPolicies(policies.filter(p => p.id !== id));
    }
  };

  const handleWhatsApp = (telefono: string) => {
    const url = `https://wa.me/${telefono.replace(/\D/g, '')}`;
    window.open(url, '_blank');
  };

  const handleExport = () => {
    const currentType = tabs[tab].value;
    const data = policies.filter(p => p.tipo === currentType);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentType);
    XLSX.writeFile(wb, `Vida_Finanzas_${currentType}_PAS_Alert.xlsx`);
  };

  const currentType = tabs[tab].value;
  const filteredPolicies = policies.filter(p => 
    p.tipo === currentType && (
      p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.cuit.includes(searchTerm)
    )
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Vida y Finanzas</Typography>
          <Typography variant="body1" color="text.secondary">Gestiona pólizas de Vida y Seguros de Retiro.</Typography>
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
            sx={{ borderRadius: 3, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
          >
            Nueva Póliza
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tab} 
          onChange={(_, newValue) => setTab(newValue)} 
          aria-label="tabs vida finanzas"
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
            placeholder="Buscar por cliente o CUIT..."
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
          <TableHead sx={{ bgcolor: 'error.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cliente</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CUIT</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                {currentType === 'Vida' ? 'Suma Asegurada' : 'Aporte Mensual'}
              </TableCell>
              {currentType === 'Retiro' && (
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Fondo Acumulado</TableCell>
              )}
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPolicies.map((policy) => (
              <TableRow key={policy.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{policy.cliente}</TableCell>
                <TableCell>{policy.cuit}</TableCell>
                <TableCell>{policy.aseguradora}</TableCell>
                <TableCell>
                  {currentType === 'Vida' 
                    ? `$${policy.sumaAsegurada?.toLocaleString()}` 
                    : `$${policy.aporteMensual?.toLocaleString()}`
                  }
                </TableCell>
                {currentType === 'Retiro' && (
                  <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                    ${policy.fondoAcumulado?.toLocaleString()}
                  </TableCell>
                )}
                <TableCell>{policy.email}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton color="success" onClick={() => handleWhatsApp(policy.telefono)}>
                    <MessageCircle size={18} />
                  </IconButton>
                  <IconButton color="primary" onClick={() => handleOpen(policy)}>
                    <Edit2 size={18} />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(policy.id)}>
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
          {editingPolicy ? 'Editar Póliza' : `Nueva Póliza (${currentType})`}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label="Nombre del Cliente" defaultValue={editingPolicy?.cliente} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="CUIT" defaultValue={editingPolicy?.cuit} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Aseguradora" defaultValue={editingPolicy?.aseguradora} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                fullWidth 
                label={currentType === 'Vida' ? "Suma Asegurada" : "Aporte Mensual"} 
                type="number"
                defaultValue={currentType === 'Vida' ? editingPolicy?.sumaAsegurada : editingPolicy?.aporteMensual} 
              />
            </Grid>
            {currentType === 'Retiro' && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Fondo Acumulado" 
                  type="number"
                  defaultValue={editingPolicy?.fondoAcumulado} 
                />
              </Grid>
            )}
            {currentType === 'Vida' && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Prima Mensual" 
                  type="number"
                  defaultValue={editingPolicy?.prima} 
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Email" defaultValue={editingPolicy?.email} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Teléfono" defaultValue={editingPolicy?.telefono} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Código Postal" defaultValue={editingPolicy?.cp} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleClose}>Guardar Póliza</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
