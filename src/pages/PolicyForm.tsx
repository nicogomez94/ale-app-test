import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  InputAdornment,
  Autocomplete,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  User, 
  CreditCard, 
  Calendar, 
  Briefcase, 
  Shield, 
  Phone, 
  Hash,
  Save
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  clienteNombre: z.string().min(3, 'Nombre requerido'),
  clienteDni: z.string().min(7, 'DNI inválido'),
  clienteTelefono: z.string().min(8, 'Teléfono requerido'),
  aseguradora: z.string().min(1, 'Aseguradora requerida'),
  rubro: z.string().min(1, 'Rubro requerido'),
  numeroPoliza: z.string().min(1, 'Número de póliza requerido'),
  fechaInicio: z.string(),
  fechaVencimiento: z.string(),
  prima: z.number().min(1, 'Prima debe ser mayor a 0'),
  porcentajeComision: z.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

export const PolicyForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prima: 0,
      porcentajeComision: 15,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const prima = watch('prima');
  const porcentaje = watch('porcentajeComision');
  const comisionCalculada = (prima * (porcentaje / 100)).toFixed(2);

  const onSubmit = (data: FormData) => {
    console.log('Guardando póliza:', { ...data, comisionCalculada });
    setOpen(true);
  };

  // Mock for autocomplete
  const aseguradoras = ['Sancor Seguros', 'Federación Patronal', 'La Segunda', 'Mercantil Andina', 'Zurich'];
  const rubros = ['Automotor', 'Hogar', 'Vida', 'Retiro', 'ART', 'Integral de Comercio', 'TRO', 'Consorcio'];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>Nueva Póliza</Typography>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <User size={20} /> Datos del Cliente
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="clienteNombre"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Nombre Completo"
                          error={!!errors.clienteNombre}
                          helperText={errors.clienteNombre?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="clienteDni"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="DNI"
                          error={!!errors.clienteDni}
                          helperText={errors.clienteDni?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="clienteTelefono"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Teléfono"
                          InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={16} /></InputAdornment> }}
                          error={!!errors.clienteTelefono}
                          helperText={errors.clienteTelefono?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Shield size={20} /> Detalles de la Póliza
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="aseguradora"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          freeSolo
                          options={aseguradoras}
                          onChange={(_, value) => field.onChange(value)}
                          onInputChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField {...params} label="Aseguradora" error={!!errors.aseguradora} helperText={errors.aseguradora?.message} />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="rubro"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          freeSolo
                          options={rubros}
                          onChange={(_, value) => field.onChange(value)}
                          onInputChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField {...params} label="Rubro" error={!!errors.rubro} helperText={errors.rubro?.message} />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="numeroPoliza"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Número de Póliza"
                          InputProps={{ startAdornment: <InputAdornment position="start"><Hash size={16} /></InputAdornment> }}
                          error={!!errors.numeroPoliza}
                          helperText={errors.numeroPoliza?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="fechaInicio"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="date"
                          label="Fecha Inicio"
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="fechaVencimiento"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="date"
                          label="Fecha Vencimiento"
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Resumen Económico</Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                
                <Box sx={{ mb: 3 }}>
                  <Controller
                    name="prima"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Prima (ARS)"
                        type="number"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        sx={{ 
                          '& .MuiOutlinedInput-root': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }
                        }}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Controller
                    name="porcentajeComision"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Porcentaje Comisión (%)"
                        type="number"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        sx={{ 
                          '& .MuiOutlinedInput-root': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }
                        }}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Comisión Estimada</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>$ {comisionCalculada}</Typography>
                </Box>
              </CardContent>
            </Card>

            <Button 
              type="submit"
              variant="contained" 
              color="secondary" 
              fullWidth 
              size="large"
              startIcon={<Save size={20} />}
              sx={{ py: 2, borderRadius: 3, fontWeight: 700 }}
            >
              Guardar Póliza
            </Button>
          </Grid>
        </Grid>
      </form>

      <Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)}>
        <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%' }}>
          Póliza guardada exitosamente.
        </Alert>
      </Snackbar>
    </Box>
  );
};
