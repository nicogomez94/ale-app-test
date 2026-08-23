import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton, MenuItem, Paper, Snackbar,
  Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { BookOpen, CalendarDays, Copy, Edit3, MessageCircle, Plus, Send, StickyNote, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const empty = { nombre: '', categoria: 'GENERAL', contenido: '' };
const normalizePhone = (value = '') => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('54')) digits = `549${digits}`;
  return digits;
};

export const ToolsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get('tab') || 'lanzador';
  const [items, setItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(empty);
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState('');
  const [snack, setSnack] = useState<{ text: string; severity: 'success' | 'error' }>({ text: '', severity: 'success' });

  const load = async () => {
    try {
      const [scriptRows, clientRows, birthdayRows, policyRows] = await Promise.all([
        api.tools.messages.list(), api.clients.list('', {}), api.clients.birthdays(30), api.dashboard.policies('expiring'),
      ]);
      setItems(scriptRows); setClients(clientRows); setBirthdays(birthdayRows); setExpiring(policyRows);
    } catch (error: any) { setSnack({ text: error.message || 'No se pudieron cargar las herramientas.', severity: 'error' }); }
  };
  useEffect(() => { void load(); setNotes(JSON.parse(localStorage.getItem('pas-alert-quick-notes') || '[]')); }, []);

  const edit = (item?: any) => { setEditing(item || null); setForm(item ? { nombre: item.nombre, categoria: item.categoria, contenido: item.contenido } : empty); setOpen(true); };
  const save = async () => {
    try {
      if (editing) await api.tools.messages.update(editing.id, form); else await api.tools.messages.create(form);
      setOpen(false); setSnack({ text: 'Script guardado.', severity: 'success' }); await load();
    } catch (error: any) { setSnack({ text: error.message, severity: 'error' }); }
  };
  const remove = async (item: any) => { if (!confirm(`¿Eliminar "${item.nombre}"?`)) return; await api.tools.messages.delete(item.id); await load(); };
  const resolvedMessage = (content: string) => content
    .replaceAll('{{nombre}}', selectedClient?.nombre || '[Nombre]')
    .replaceAll('[Nombre]', selectedClient?.nombre || '[Nombre]')
    .replaceAll('[Nombre Usuario]', user?.nombre || 'PAS Alert');
  const useScript = (item: any) => { setMessage(resolvedMessage(item.contenido)); navigate('/herramientas?tab=lanzador'); };
  const sendChat = () => {
    const target = normalizePhone(phone || selectedClient?.telefono || '');
    if (!target || !message.trim()) { setSnack({ text: 'Elegí un contacto y escribí un mensaje.', severity: 'error' }); return; }
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(message.trim())}`, '_blank', 'noopener,noreferrer');
  };
  const addNote = () => {
    if (!newNote.trim()) return;
    const next = [newNote.trim(), ...notes]; setNotes(next); localStorage.setItem('pas-alert-quick-notes', JSON.stringify(next)); setNewNote('');
  };
  const title = useMemo(() => ({ lanzador: 'Lanzador de Chats', biblioteca: 'Biblioteca de Scripts', calendario: 'Calendario', notas: 'Notas Rápidas' }[activeTab] || 'Lanzador de Chats'), [activeTab]);

  return <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 3, color: '#08755f' }}><MessageCircle size={34} /><Typography variant="h3" sx={{ fontSize: { xs: 30, md: 38 }, fontWeight: 950 }}>{title}</Typography></Box>
    <Paper sx={{ borderRadius: 5, overflow: 'hidden', boxShadow: '0 18px 48px rgba(24,38,78,.08)' }}>
      <Tabs value={activeTab} onChange={(_, value) => navigate(`/herramientas?tab=${value}`)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid', borderColor: 'divider', '& .MuiTab-root': { minHeight: 70, fontWeight: 900 } }}>
        <Tab value="lanzador" icon={<Send size={18} />} iconPosition="start" label="Lanzador" />
        <Tab value="biblioteca" icon={<BookOpen size={18} />} iconPosition="start" label="Biblioteca de Scripts" />
        <Tab value="calendario" icon={<CalendarDays size={18} />} iconPosition="start" label="Calendario" />
        <Tab value="notas" icon={<StickyNote size={18} />} iconPosition="start" label="Notas Rápidas" />
      </Tabs>

      {activeTab === 'lanzador' && <Box sx={{ p: { xs: 2, md: 4 } }}><Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}><Typography variant="h5" fontWeight={950} mb={2}>Nuevo mensaje</Typography><Autocomplete options={clients} getOptionLabel={(option) => `${option.nombre} · ${option.telefono || 'sin teléfono'}`} value={selectedClient} onChange={(_, value) => { setSelectedClient(value); setPhone(value?.telefono || ''); }} renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Buscar por nombre..." />} /><TextField fullWidth sx={{ mt: 2 }} label="Teléfono de WhatsApp" value={phone} onChange={(event) => setPhone(event.target.value)} /><TextField fullWidth multiline minRows={8} sx={{ mt: 2 }} label="Mensaje" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribí el mensaje o elegí un script..." /><Button fullWidth size="large" color="success" variant="contained" startIcon={<MessageCircle />} onClick={sendChat} sx={{ mt: 2, py: 1.6 }}>Abrir chat en WhatsApp</Button></Grid>
        <Grid size={{ xs: 12, md: 5 }}><Typography variant="h5" fontWeight={950} mb={2}>Scripts rápidos</Typography><Box sx={{ display: 'grid', gap: 1.4 }}>{items.map((item) => <Card key={item.id} variant="outlined" sx={{ borderRadius: 3, borderLeft: '5px solid #36d28c' }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Box><Chip size="small" label={item.categoria} /><Typography fontWeight={900} mt={.7}>{item.nombre}</Typography></Box><Tooltip title="Usar script"><IconButton color="success" onClick={() => useScript(item)}><Send size={18} /></IconButton></Tooltip></Box><Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.contenido}</Typography></CardContent></Card>)}{!items.length && <Alert severity="info">Creá tu primer script desde la biblioteca.</Alert>}</Box></Grid>
      </Grid></Box>}

      {activeTab === 'biblioteca' && <Box sx={{ p: { xs: 2, md: 4 } }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}><Box><Typography variant="h5" fontWeight={950}>Scripts de Respuesta Rápida</Typography><Typography color="text.secondary">Guardá mensajes frecuentes y lanzalos con un clic.</Typography></Box><Button variant="contained" color="success" startIcon={<Plus />} onClick={() => edit()}>Nuevo Script</Button></Box><Grid container spacing={2.5}>{items.map((item) => <Grid key={item.id} size={{ xs: 12, md: 6 }}><Card sx={{ height: '100%', borderRadius: 4, borderLeft: '6px solid #36d28c' }}><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Box><Chip size="small" label={item.categoria} /><Typography variant="h6" fontWeight={900} mt={1}>{item.nombre}</Typography></Box><Box><Tooltip title="Enviar"><IconButton color="success" onClick={() => useScript(item)}><Send size={18} /></IconButton></Tooltip><Tooltip title="Copiar"><IconButton onClick={() => { navigator.clipboard.writeText(item.contenido); setSnack({ text: 'Script copiado.', severity: 'success' }); }}><Copy size={18} /></IconButton></Tooltip><IconButton onClick={() => edit(item)}><Edit3 size={18} /></IconButton><IconButton color="error" onClick={() => remove(item)}><Trash2 size={18} /></IconButton></Box></Box><Typography sx={{ mt: 2, whiteSpace: 'pre-wrap', color: 'text.secondary', fontStyle: 'italic' }}>{item.contenido}</Typography></CardContent></Card></Grid>)}</Grid></Box>}

      {activeTab === 'calendario' && <Box sx={{ p: { xs: 2, md: 4 } }}><Typography variant="h5" fontWeight={950} mb={2}>Próximos eventos</Typography><Grid container spacing={2}><Grid size={{ xs: 12, md: 6 }}><Card variant="outlined"><CardContent><Typography fontWeight={900} mb={1}>🎂 Cumpleaños</Typography>{birthdays.map((item) => <Box key={item.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{item.nombre} · en {item.diasRestantes} días</Box>)}{!birthdays.length && <Typography color="text.secondary">Sin cumpleaños próximos.</Typography>}</CardContent></Card></Grid><Grid size={{ xs: 12, md: 6 }}><Card variant="outlined"><CardContent><Typography fontWeight={900} mb={1}>⚠️ Vencimientos</Typography>{expiring.map((item) => <Box key={item.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{item.cliente} · {item.poliza} · {item.diasRestantes} días</Box>)}{!expiring.length && <Typography color="text.secondary">Sin vencimientos próximos.</Typography>}</CardContent></Card></Grid></Grid></Box>}

      {activeTab === 'notas' && <Box sx={{ p: { xs: 2, md: 4 } }}><Box sx={{ display: 'flex', gap: 1, mb: 3 }}><TextField fullWidth label="Nueva nota rápida" value={newNote} onChange={(event) => setNewNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addNote(); }} /><Button variant="contained" onClick={addNote}>Guardar</Button></Box><Grid container spacing={2}>{notes.map((note, index) => <Grid key={`${note}-${index}`} size={{ xs: 12, md: 6 }}><Card sx={{ bgcolor: '#fffbea', borderLeft: '5px solid #f4b400' }}><CardContent sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography>{note}</Typography><IconButton color="error" onClick={() => { const next = notes.filter((_, current) => current !== index); setNotes(next); localStorage.setItem('pas-alert-quick-notes', JSON.stringify(next)); }}><Trash2 size={18} /></IconButton></CardContent></Card></Grid>)}</Grid></Box>}
    </Paper>

    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}><DialogTitle fontWeight={900}>{editing ? 'Editar Script' : 'Nuevo Script'}</DialogTitle><DialogContent sx={{ display: 'grid', gap: 2, pt: '10px !important' }}><TextField label="Título del Script" value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} /><TextField select label="Categoría" value={form.categoria} onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))}>{['GENERAL', 'CUMPLEAÑOS', 'VENCIMIENTO', 'COTIZACIÓN', 'SINIESTRO'].map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</TextField><TextField multiline minRows={6} label="Contenido del Mensaje" value={form.contenido} onChange={(e) => setForm((s) => ({ ...s, contenido: e.target.value }))} helperText="Usá {{nombre}} para insertar el nombre del cliente." /></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setOpen(false)}>Cancelar</Button><Button color="success" variant="contained" onClick={save} disabled={!form.nombre.trim() || !form.contenido.trim()}>Guardar Script</Button></DialogActions></Dialog>
    <Snackbar open={!!snack.text} autoHideDuration={3500} onClose={() => setSnack((value) => ({ ...value, text: '' }))}><Alert severity={snack.severity}>{snack.text}</Alert></Snackbar>
  </Box>;
};
