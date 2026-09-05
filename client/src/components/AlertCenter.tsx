import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, IconButton, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { AlertTriangle, Cake, Gift, MessageCircle, MessageSquareQuote, ShieldAlert, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api, DashboardPolicy } from '../api';
import { useNavigate } from 'react-router-dom';

const waPhone = (value = '') => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('54')) return digits;
  return digits.length === 10 ? `549${digits}` : digits;
};

const heartbeatSx = {
  animation: 'alertHeartbeat 1.7s ease-in-out infinite',
  '@keyframes alertHeartbeat': {
    '0%, 100%': { transform: 'scale(1)' },
    '10%': { transform: 'scale(1.06)' },
    '20%': { transform: 'scale(1)' },
    '30%': { transform: 'scale(1.04)' },
    '42%': { transform: 'scale(1)' },
  },
};

const dueTodayPulseSx = {
  animation: 'dueTodayPulse 1.35s ease-in-out infinite',
  transformOrigin: 'center',
  '@keyframes dueTodayPulse': {
    '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 157, 0, 0)' },
    '50%': { transform: 'scale(1.08)', boxShadow: '0 0 0 7px rgba(255, 157, 0, .2)' },
  },
};

export const AlertCenter: React.FC = () => {
  const navigate = useNavigate();
  const [expiring, setExpiring] = useState<DashboardPolicy[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [newQuotes, setNewQuotes] = useState(0);

  useEffect(() => {
    const refreshQuoteCount = () => Promise.all([api.dashboard.policies('expiring'), api.dashboard.stats()]).then(([policies, stats]) => {
      setExpiring(policies);
      setNewQuotes(stats.cotizacionesSinVer || 0);
    }).catch(() => {});
    Promise.all([api.dashboard.policies('expiring'), api.clients.birthdays(7), api.dashboard.stats()]).then(([policies, birthdayRows, stats]) => {
      setExpiring(policies);
      setBirthdays(birthdayRows);
      setNewQuotes(stats.cotizacionesSinVer || 0);
      const dayKey = new Date().toISOString().slice(0, 10);
      const storageKey = `pas-alert-open-alerts-${dayKey}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, '1');
        if (policies.length) setExpiryOpen(true);
        else if (birthdayRows.length) setBirthdayOpen(true);
      }
    }).catch(() => {});
    window.addEventListener('pas-alert:refresh-counts', refreshQuoteCount);
    return () => window.removeEventListener('pas-alert:refresh-counts', refreshQuoteCount);
  }, []);

  const expiringGroups = useMemo(() => {
    const seen = new Set<string>();
    return expiring.filter((item) => {
      const key = item.groupId || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [expiring]);

  const closeExpiry = () => {
    setExpiryOpen(false);
    if (birthdays.length) setBirthdayOpen(true);
  };

  const openWhatsApp = (phone: string, message: string) => {
    const normalized = waPhone(phone);
    if (normalized) window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1 }}>
        <Chip icon={<AlertTriangle size={16} />} label={`Vencimientos (${expiringGroups.length})`} onClick={() => setExpiryOpen(true)} sx={{ bgcolor: '#ff8a00', color: 'white', fontWeight: 900, boxShadow: '0 5px 14px rgba(255,138,0,.28)', '& .MuiChip-icon': { color: 'white' }, ...(expiringGroups.length ? heartbeatSx : {}) }} />
        <Button
          type="button"
          aria-label={`Abrir cotizaciones nuevas (${newQuotes})`}
          startIcon={<MessageSquareQuote size={16} />}
          onClick={() => navigate('/cotizaciones')}
          sx={{ minWidth: 0, minHeight: 32, px: 1.5, py: .5, bgcolor: '#2563eb', color: 'white', fontWeight: 900, boxShadow: '0 5px 14px rgba(37,99,235,.24)', '&:hover': { bgcolor: '#1d4ed8' }, ...(newQuotes ? heartbeatSx : {}) }}
        >
          Cotizaciones ({newQuotes})
        </Button>
        <Chip icon={<Gift size={16} />} label={`Cumpleaños (${birthdays.length})`} onClick={() => setBirthdayOpen(true)} sx={{ bgcolor: '#08bf68', color: '#073b22', fontWeight: 900, boxShadow: '0 5px 14px rgba(8,191,104,.24)', '& .MuiChip-icon': { color: '#073b22' }, ...(birthdays.length ? heartbeatSx : {}) }} />
      </Box>

      <Dialog open={expiryOpen} onClose={closeExpiry} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, border: '2px solid #ff9d23', overflow: 'hidden' } }}>
        <DialogContent sx={(theme) => ({ p: { xs: 2, md: 3 }, bgcolor: theme.palette.mode === 'light' ? '#fffdfa' : '#15120e', color: 'text.primary' })}>
          <Paper elevation={0} sx={(theme) => ({ bgcolor: theme.palette.mode === 'light' ? '#fff3df' : '#2b2114', borderRadius: 1.5, p: 2, display: 'flex', gap: 2, alignItems: 'center', position: 'relative' })}>
            <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: '#ff9d00', color: 'white', display: 'grid', placeItems: 'center' }}><ShieldAlert /></Box>
            <Box><Typography variant="h5" fontWeight={950} sx={(theme) => ({ color: theme.palette.mode === 'light' ? '#d65c00' : '#ffb45e' })}>¡Atención de Vencimientos Semanales!</Typography><Typography variant="caption" fontWeight={800} sx={(theme) => ({ color: theme.palette.mode === 'light' ? '#d87522' : '#ffc47d' })}>PAS Alert System — Notificación Automática de Apertura</Typography></Box>
            <IconButton onClick={closeExpiry} sx={{ position: 'absolute', right: 10, top: 10 }}><X /></IconButton>
          </Paper>
          <Box sx={(theme) => ({ my: 2, p: 1.5, bgcolor: theme.palette.mode === 'light' ? '#fff7e8' : '#251d12', borderRadius: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' })}><AlertTriangle color="#f5a02a" /><Typography fontWeight={800}>Se registran {expiringGroups.length} póliza(s) con vencimiento dentro de los próximos 7 días:</Typography></Box>
          <Box sx={(theme) => ({ overflowX: 'auto', border: '1px solid', borderColor: theme.palette.mode === 'light' ? '#f0bb58' : '#8d6425', borderRadius: 1, bgcolor: theme.palette.mode === 'light' ? '#f5f7fb' : '#0a0a0a' })}>
            <Table size="small" sx={{ minWidth: 760, borderSpacing: '0 8px', '& > tbody > tr > td:first-of-type': { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 }, '& > tbody > tr > td:last-of-type': { borderTopRightRadius: 2, borderBottomRightRadius: 2 } }}>
              <TableHead sx={(theme) => ({ bgcolor: theme.palette.mode === 'light' ? '#fff8db' : '#33280f' })}><TableRow>{['Nombre del Cliente', 'N° de Póliza', 'Categoría / Ramo', 'Forma de pago', 'Fecha de Vencimiento', 'Estado', 'Acción'].map((h) => <TableCell key={h} sx={(theme) => ({ fontWeight: 900, color: theme.palette.mode === 'light' ? '#9c7014' : '#ffd27a' })}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>{expiringGroups.map((policy) => <TableRow key={policy.id}>
                <TableCell sx={{ fontWeight: 800 }}>{policy.cliente}</TableCell><TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>{policy.poliza}</TableCell><TableCell><Chip size="small" label={policy.rubro} sx={{ bgcolor: 'primary.dark', color: 'white', fontWeight: 800 }} /></TableCell><TableCell sx={{ fontWeight: 800 }}>{policy.medioPago || 'Sin informar'}</TableCell><TableCell sx={{ color: 'error.light', fontWeight: 800 }}>{format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}</TableCell><TableCell><Chip size="small" label={policy.diasRestantes <= 0 ? '¡VENCE HOY!' : `Vence en ${policy.diasRestantes} días`} sx={(theme) => ({ bgcolor: theme.palette.mode === 'light' ? '#ffd995' : '#a85b00', color: theme.palette.mode === 'light' ? '#704100' : '#fff7e8', fontWeight: 900, ...(policy.diasRestantes <= 0 ? dueTodayPulseSx : {}) })} /></TableCell><TableCell><Button size="small" variant="contained" color="success" startIcon={<MessageCircle size={15} />} onClick={() => openWhatsApp(policy.telefono, `Hola ${policy.cliente}, te recordamos que tu póliza ${policy.poliza} vence el ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}. Forma de pago: ${policy.medioPago || 'a confirmar'}.`)}>WhatsApp</Button></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}><Button href="/dashboard?filter=expiring" variant="outlined" color="warning">Ver en Panel de Control</Button><Button onClick={closeExpiry} variant="contained" color="warning">Entendido / Cerrar</Button></Box>
        </DialogContent>
      </Dialog>

      <Dialog open={birthdayOpen} onClose={() => setBirthdayOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 5, border: '2px solid #19d27a', overflow: 'hidden' } }}>
        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ bgcolor: '#ffe7ef', borderRadius: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center', position: 'relative' }}><Box sx={{ width: 46, height: 46, bgcolor: '#ef2f75', color: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Cake /></Box><Box><Typography variant="h5" fontWeight={950} color="#bc1f58">¡Cumpleaños de la Semana!</Typography><Typography variant="caption" fontWeight={800} color="#c23c69">Fidelizá a tus clientes saludándolos en su día</Typography></Box><IconButton onClick={() => setBirthdayOpen(false)} sx={{ position: 'absolute', right: 10, top: 10 }}><X /></IconButton></Box>
          <Box sx={{ my: 2, bgcolor: '#ffe6ef', p: 1.5, borderRadius: 3 }}><Typography fontWeight={850} color="#b51e53">Se registran {birthdays.length} cliente(s) que cumplen años dentro de los próximos 7 días:</Typography></Box>
          <Box sx={{ overflowX: 'auto', border: '1px solid #efb5c9', borderRadius: 3 }}><Table size="small" sx={{ minWidth: 680 }}><TableHead sx={{ bgcolor: '#ffe8f0' }}><TableRow>{['Nombre del Cliente', 'Fecha de Nacimiento', 'Próximo Cumpleaños', 'Edad a cumplir', 'Acción'].map((h) => <TableCell key={h} sx={{ color: '#aa3159', fontWeight: 900 }}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{birthdays.map((client) => <TableRow key={client.id}><TableCell sx={{ fontWeight: 800 }}>{client.nombre}</TableCell><TableCell>{format(parseISO(client.fechaNacimiento), 'dd/MM/yyyy')}</TableCell><TableCell sx={{ color: '#d82f68', fontWeight: 800 }}>{format(parseISO(client.proximoCumpleanos), 'dd/MM/yyyy')}</TableCell><TableCell sx={{ color: '#4e46aa', fontWeight: 850 }}>{client.edad} años</TableCell><TableCell><Button size="small" variant="contained" color="success" startIcon={<MessageCircle size={15} />} onClick={() => openWhatsApp(client.telefono, `¡Feliz cumpleaños, ${client.nombre}! Te deseamos un excelente día. Saludos de PAS Alert.`)}>Saludar</Button></TableCell></TableRow>)}</TableBody></Table></Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}><Button onClick={() => setBirthdayOpen(false)} variant="contained" color="success">Entendido / Cerrar</Button></Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
