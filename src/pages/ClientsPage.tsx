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
  Grid
} from '@mui/material';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Download,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  User
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuItem } from '@mui/material';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNewIndividual = () => {
    handleMenuClose();
    handleOpen();
  };

  const handleNewCompany = () => {
    handleMenuClose();
    navigate('/empresas', { state: { openNew: true } });
  };

  const [clients, setClients] = useState([
    { id: '1', nombre: 'Juan Pérez', dni: '30123456', telefono: '1122334455', email: 'juan@example.com', direccion: 'Av. Corrientes 1234', cp: '1000' },
    { id: '2', nombre: 'María García', dni: '25987654', telefono: '1199887766', email: 'maria@example.com', direccion: 'Calle Falsa 123', cp: '2000' },
    { id: '3', nombre: 'Carlos López', dni: '35112233', telefono: '1155443322', email: 'carlos@example.com', direccion: 'Rivadavia 500', cp: '3000' },
  ]);

  const handleOpen = (client?: any) => {
    setEditingClient(client || null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingClient(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const handleWhatsApp = (telefono: string) => {
    const url = `https://wa.me/${telefono.replace(/\D/g, '')}`;
    window.open(url, '_blank');
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(clients);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "Clientes_PAS_Alert.xlsx");
  };

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.dni.includes(searchTerm)
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Gestión de Clientes</Typography>
          <Typography variant="body1" color="text.secondary">Administra tu cartera de clientes individuales.</Typography>
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
            onClick={handleMenuOpen}
            sx={{ borderRadius: 3 }}
          >
            Nuevo...
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleNewIndividual} sx={{ gap: 1.5 }}>
              <User size={18} />
              Nuevo Cliente (Individuo)
            </MenuItem>
            <MenuItem onClick={handleNewCompany} sx={{ gap: 1.5 }}>
              <Building2 size={18} />
              Nueva Empresa
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Buscar por nombre o DNI..."
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
            {filteredClients.map((client) => (
              <TableRow key={client.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{client.nombre}</TableCell>
                <TableCell>{client.dni}</TableCell>
                <TableCell>{client.telefono}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.cp}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton color="success" onClick={() => handleWhatsApp(client.telefono)}>
                    <MessageCircle size={18} />
                  </IconButton>
                  <IconButton color="primary" onClick={() => handleOpen(client)}>
                    <Edit2 size={18} />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(client.id)}>
                    <Trash2 size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Nombre Completo" defaultValue={editingClient?.nombre} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="DNI" defaultValue={editingClient?.dni} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Teléfono" defaultValue={editingClient?.telefono} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Email" defaultValue={editingClient?.email} />
            </Grid>
            <Grid size={{ xs: 8 }}>
              <TextField fullWidth label="Dirección" defaultValue={editingClient?.direccion} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth label="Código Postal" defaultValue={editingClient?.cp} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleClose}>Guardar Cliente</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
