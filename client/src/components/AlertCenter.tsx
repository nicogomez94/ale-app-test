import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, IconButton, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { AlertTriangle, Cake, Gift, MessageCircle, ShieldAlert, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api, DashboardPolicy } from '../api';

const waPhone = (value = '') => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('54')) return digits;
  return digits.length === 10 ? `549${digits}` : digits;
};

export const AlertCenter: React.FC = () => {
  const [expiring, setExpiring] = useState<DashboardPolicy[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.dashboard.policies('expiring'), api.clients.birthdays(7)]).then(([policies, birthdayRows]) => {
      setExpiring(policies);
      setBirthdays(birthdayRows);
      const dayKey = new Date().toISOString().slice(0, 10);
      const storageKey = `pas-alert-open-alerts-${dayKey}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, '1');
        if (policies.length) setExpiryOpen(true);
        else if (birthdayRows.length) setBirthdayOpen(true);
      }
    }).catch(() => {});
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
        <Chip icon={<AlertTriangle size={16} />} label={`Vencimientos (${expiringGroups.length})`} onClick={() => setExpiryOpen(true)} sx={{ bgcolor: '#ff8a00', color: 'white', fontWeight: 900, boxShadow: '0 5px 14px rgba(255,138,0,.28)', '& .MuiChip-icon': { color: 'white' } }} />
        <Chip icon={<Gift size={16} />} label={`Cumpleaños (${birthdays.length})`} onClick={() => setBirthdayOpen(true)} sx={{ bgcolor: '#08bf68', color: '#073b22', fontWeight: 900, boxShadow: '0 5px 14px rgba(8,191,104,.24)', '& .MuiChip-icon': { color: '#073b22' } }} />
      </Box>

      <Dialog open={expiryOpen} onClose={closeExpiry} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 5, border: '2px solid #ff9d23', overflow: 'hidden' } }}>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: '#fffdfa' }}>
          <Paper elevation={0} sx={{ bgcolor: '#fff3df', borderRadius: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center', position: 'relative' }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: '#ff9d00', color: 'white', display: 'grid', placeItems: 'center' }}><ShieldAlert /></Box>
            <Box><Typography variant="h5" fontWeight={950} color="#d65c00">¡Atención de Vencimientos Semanales!</Typography><Typography variant="caption" fontWeight={800} color="#d87522">PAS Alert System — Notificación Automática de Apertura</Typography></Box>
            <IconButton onClick={closeExpiry} sx={{ position: 'absolute', right: 10, top: 10 }}><X /></IconButton>
          </Paper>
          <Box sx={{ my: 2, p: 1.5, bgcolor: '#fff7e8', borderRadius: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}><AlertTriangle color="#e88a13" /><Typography fontWeight={800}>Se registran {expiringGroups.length} póliza(s) con vencimiento dentro de los próximos 7 días:</Typography></Box>
          <Box sx={{ overflowX: 'auto', border: '1px solid #f0bb58', borderRadius: 3 }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead sx={{ bgcolor: '#fff8db' }}><TableRow>{['Nombre del Cliente', 'N° de Póliza', 'Categoría / Ramo', 'Fecha de Vencimiento', 'Estado', 'Acción'].map((h) => <TableCell key={h} sx={{ fontWeight: 900, color: '#9c7014' }}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>{expiringGroups.map((policy) => <TableRow key={policy.id}>
                <TableCell sx={{ fontWeight: 800 }}>{policy.cliente}</TableCell><TableCell sx={{ color: '#252c85', fontWeight: 800 }}>{policy.poliza}</TableCell><TableCell><Chip size="small" label={policy.rubro} sx={{ bgcolor: '#24298d', color: 'white', fontWeight: 800 }} /></TableCell><TableCell sx={{ color: '#d63c32', fontWeight: 800 }}>{format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}</TableCell><TableCell><Chip size="small" label={policy.diasRestantes <= 0 ? '¡VENCE HOY!' : `Vence en ${policy.diasRestantes} días`} sx={{ bgcolor: '#ffd995', color: '#8a5200', fontWeight: 900 }} /></TableCell><TableCell><Button size="small" variant="contained" color="success" startIcon={<MessageCircle size={15} />} onClick={() => openWhatsApp(policy.telefono, `Hola ${policy.cliente}, te recordamos que tu póliza ${policy.poliza} vence el ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}.`)}>WhatsApp</Button></TableCell>
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
