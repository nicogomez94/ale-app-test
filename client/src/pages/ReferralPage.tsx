import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  InputAdornment, Divider, List, ListItem, ListItemIcon, ListItemText,
  Paper, CircularProgress
} from '@mui/material';
import { Copy, Share2, Users, CheckCircle2, Gift, TrendingUp, Award, Mail } from 'lucide-react';
import { api } from '../api';

export const ReferralPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.referrals.status().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (method: string) => {
    api.referrals.trackShare(method).catch(() => {});
    const msg = `¡Unite a AD System! Usá mi código ${data?.referralCode || ''} y obtené beneficios. https://adsystem.com`;
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`mailto:?subject=AD System - Invitación&body=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const referralCode = data?.referralCode || 'N/A';
  const referidosMes = data?.referidosMes || 0;
  const referidosTotales = data?.referidosTotales || 0;
  const progreso = data?.progreso || 0;
  const descuento = data?.descuento || '0%';
  const proximoObjetivo = referidosMes < 1 ? 1 : referidosMes < 5 ? 5 : 10;
  const faltan = proximoObjetivo - referidosMes;
  const proximoDescuento = proximoObjetivo === 1 ? '10%' : proximoObjetivo === 5 ? '50%' : '100%';

  const benefits = [
    { text: '1 Referido: 10% de descuento en tu próxima cuota.', icon: <Gift size={20} /> },
    { text: '5 Referidos: 50% de descuento en tu próxima cuota.', icon: <TrendingUp size={20} /> },
    { text: '10 Referidos en el mes: 100% BONIFICADO el próximo mes.', icon: <Award size={20} /> },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Programa de Referidos</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Invita a otros colegas PAS y obtén beneficios exclusivos en tu suscripción.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Tu Código de Referido</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Comparte este código con tus colegas. Cuando se registren usando tu código, ambos recibirán beneficios.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth value={referralCode}
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Users size={18} /></InputAdornment> }} />
                <Button variant="contained" startIcon={<Copy size={18} />} onClick={handleCopy} sx={{ minWidth: 120 }}>
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<Share2 size={18} />} fullWidth onClick={() => handleShare('whatsapp')}>
                  Compartir en WhatsApp
                </Button>
                <Button variant="outlined" startIcon={<Mail size={18} />} fullWidth onClick={() => handleShare('email')}>
                  Enviar por Email
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Beneficios por Referidos</Typography>
              <List>
                {benefits.map((benefit, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon sx={{ color: 'primary.main' }}>{benefit.icon}</ListItemIcon>
                      <ListItemText primary={benefit.text} primaryTypographyProps={{ fontWeight: 600 }} />
                    </ListItem>
                    {index < benefits.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ bgcolor: 'primary.dark', color: 'white', height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>Estado de Referidos</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 4 }}>
                Los referidos se reinician el día 1 de cada mes.
              </Typography>

              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h2" sx={{ fontWeight: 800 }}>{referidosMes}</Typography>
                <Typography variant="overline" sx={{ letterSpacing: 2 }}>Referidos este mes</Typography>
              </Box>

              <Paper sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 3, borderRadius: 3, color: 'white' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                  <CheckCircle2 size={18} /> Próximo Objetivo: {proximoObjetivo} Referidos
                </Typography>
                <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'white' }}>Progreso</Typography>
                  <Typography variant="caption" sx={{ color: 'white' }}>{progreso}%</Typography>
                </Box>
                <Box sx={{ height: 10, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'hidden' }}>
                  <Box sx={{ width: `${progreso}%`, height: '100%', bgcolor: 'secondary.main' }} />
                </Box>
                <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.9, color: 'white' }}>
                  ¡Te faltan {faltan} referido{faltan !== 1 ? 's' : ''} para el {proximoDescuento} de descuento!
                </Typography>
              </Paper>

              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" gutterBottom>Historial Total</Typography>
                <Typography variant="h6">{referidosTotales} Referidos Totales</Typography>
              </Box>

              {descuento !== '0%' && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,200,83,0.2)', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    Descuento actual: {descuento}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
