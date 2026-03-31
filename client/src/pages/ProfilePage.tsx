import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Avatar, IconButton, Divider, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { Camera, Save, User, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { DEBUG, debugData } from '../data/debugData';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '', email: '', telefono: '', direccion: '', avatar: ''
  });
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Password dialog
  const [pwOpen, setPwOpen] = useState(false);
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api.profile.get().then((data) => {
      setFormData({
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || (DEBUG ? debugData.profile.telefono : ''),
        direccion: data.direccion || (DEBUG ? debugData.profile.direccion : ''),
        avatar: data.avatar || '',
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.profile.update(formData);
      updateUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (pwData.newPassword !== pwData.confirm) {
      setPwError('Las contraseñas no coinciden.');
      return;
    }
    if (pwData.newPassword.length < 6) {
      setPwError('La nueva contraseña debe tener mínimo 6 caracteres.');
      return;
    }
    setPwSaving(true);
    try {
      await api.profile.changePassword(pwData.currentPassword, pwData.newPassword);
      setPwOpen(false);
      setPwData({ currentPassword: '', newPassword: '', confirm: '' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>Mi Perfil</Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }}>Perfil actualizado correctamente.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={formData.avatar}
                  sx={{ width: 120, height: 120, mb: 2, mx: 'auto', bgcolor: 'primary.main', fontSize: '3rem' }}
                >
                  {formData.nombre.charAt(0)}
                </Avatar>
                <IconButton
                  component="label"
                  sx={{
                    position: 'absolute', bottom: 10, right: 0,
                    bgcolor: 'secondary.main', color: 'white',
                    '&:hover': { bgcolor: 'secondary.dark' }
                  }}
                >
                  <Camera size={18} />
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </IconButton>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{formData.nombre}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{formData.email}</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ bgcolor: 'primary.light', color: 'white', px: 2, py: 0.5, borderRadius: 5, fontWeight: 700 }}>
                  {user?.plan || 'TRIAL'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3, bgcolor: 'primary.dark', color: 'white' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShieldCheck size={20} /> Seguridad
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                Tu cuenta está protegida.
              </Typography>
              <Button variant="outlined" color="inherit" fullWidth size="small" onClick={() => setPwOpen(true)}>
                Cambiar Contraseña
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>Información Personal</Typography>
              <Divider sx={{ mb: 4 }} />

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Nombre Completo" value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      InputProps={{ startAdornment: <User size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Correo Electrónico" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      InputProps={{ startAdornment: <Mail size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Teléfono de Contacto" value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      InputProps={{ startAdornment: <Phone size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Dirección de Oficina" value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      InputProps={{ startAdornment: <MapPin size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }} />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="contained" size="large" disabled={saving}
                    startIcon={<Save size={20} />} sx={{ px: 4, py: 1.5, borderRadius: 3 }}>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar Contraseña</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {pwError && <Alert severity="error">{pwError}</Alert>}
          <TextField fullWidth type="password" label="Contraseña Actual" value={pwData.currentPassword}
            onChange={(e) => setPwData({ ...pwData, currentPassword: e.target.value })} />
          <TextField fullWidth type="password" label="Nueva Contraseña" value={pwData.newPassword}
            onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })} />
          <TextField fullWidth type="password" label="Confirmar Nueva Contraseña" value={pwData.confirm}
            onChange={(e) => setPwData({ ...pwData, confirm: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handlePasswordChange} disabled={pwSaving}>
            {pwSaving ? 'Guardando...' : 'Cambiar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
