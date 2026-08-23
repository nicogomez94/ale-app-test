import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Snackbar, TextField, Typography } from '@mui/material';
import { Lightbulb, Plus } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export const SuggestionsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ asunto: '', mensaje: '' });
  const [reply, setReply] = useState<Record<string, string>>({});
  const [snack, setSnack] = useState('');
  const load = () => api.tools.suggestions.list().then(setItems).catch((e) => setSnack(e.message));
  useEffect(() => { void load(); }, []);
  const submit = async () => { await api.tools.suggestions.create(form); setOpen(false); setForm({ asunto: '', mensaje: '' }); setSnack('Sugerencia enviada'); load(); };
  const answer = async (id: string) => { await api.tools.suggestions.reply(id, reply[id] || ''); setSnack('Respuesta guardada'); load(); };
  return <Box><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, gap: 2 }}><Box><Typography variant="h4" fontWeight={950}>{user?.isAdmin ? 'Panel de Sugerencias' : 'Sugerencias'}</Typography><Typography color="text.secondary">{user?.isAdmin ? 'Revisá y respondé los comentarios recibidos.' : 'Contanos qué mejorarías de PAS Alert.'}</Typography></Box>{!user?.isAdmin && <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>Nueva sugerencia</Button>}</Box>
    <Grid container spacing={2}>{items.map((item) => <Grid key={item.id} size={12}><Card sx={{ borderRadius: 4, borderLeft: `6px solid ${item.estado === 'RESPONDIDA' ? '#12b76a' : '#f4b400'}` }}><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Box><Typography variant="h6" fontWeight={900}>{item.asunto}</Typography>{item.user && <Typography variant="caption" color="text.secondary">{item.user.nombre} · {item.user.email}</Typography>}</Box><Chip size="small" label={item.estado} color={item.estado === 'RESPONDIDA' ? 'success' : 'warning'} /></Box><Typography sx={{ my: 2 }}>{item.mensaje}</Typography>{item.respuesta && <Alert severity="success"><strong>Respuesta:</strong> {item.respuesta}</Alert>}{user?.isAdmin && <Box sx={{ display: 'flex', gap: 1, mt: 2 }}><TextField fullWidth size="small" placeholder="Escribir respuesta..." value={reply[item.id] ?? item.respuesta ?? ''} onChange={(e) => setReply((s) => ({ ...s, [item.id]: e.target.value }))} /><Button variant="contained" onClick={() => answer(item.id)}>Responder</Button></Box>}</CardContent></Card></Grid>)}{!items.length && <Grid size={12}><Card sx={{ p: 6, textAlign: 'center' }}><Lightbulb size={42} color="#e4ad13" /><Typography color="text.secondary">No hay sugerencias todavía.</Typography></Card></Grid>}</Grid>
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth><DialogTitle fontWeight={900}>Nueva sugerencia</DialogTitle><DialogContent sx={{ display: 'grid', gap: 2, pt: '10px !important' }}><TextField label="Asunto" value={form.asunto} onChange={(e) => setForm((s) => ({ ...s, asunto: e.target.value }))} /><TextField multiline minRows={6} label="Contanos tu idea" value={form.mensaje} onChange={(e) => setForm((s) => ({ ...s, mensaje: e.target.value }))} /></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="contained" disabled={!form.asunto.trim() || !form.mensaje.trim()} onClick={submit}>Enviar</Button></DialogActions></Dialog><Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')}><Alert severity="success">{snack}</Alert></Snackbar>
  </Box>;
};
