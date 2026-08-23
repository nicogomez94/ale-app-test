import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, MenuItem, TextField, Tooltip } from '@mui/material';
import { MessageCircle, Send } from 'lucide-react';
import { api } from '../api';

export const WhatsAppLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [client, setClient] = useState<any | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    Promise.all([api.clients.list(), api.tools.messages.list()]).then(([c, t]) => { setClients(c); setTemplates(t); }).catch(() => {});
  }, [open]);

  const selectedTemplate = useMemo(() => templates.find((item) => item.id === templateId), [templates, templateId]);
  useEffect(() => {
    if (selectedTemplate) setMessage(selectedTemplate.contenido.replaceAll('{{nombre}}', client?.nombre || ''));
  }, [selectedTemplate, client]);

  const send = () => {
    const phone = String(client?.telefono || '').replace(/\D/g, '');
    if (!phone || !message.trim()) return;
    window.open(`https://wa.me/${phone.startsWith('54') ? phone : `549${phone}`}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return <>
    <Tooltip title="Abrir WhatsApp"><Fab onClick={() => setOpen(true)} aria-label="Abrir WhatsApp" sx={{ position: 'fixed', right: 28, bottom: 28, zIndex: 1300, bgcolor: '#19b95b', color: 'white', '&:hover': { bgcolor: '#109746' } }}><MessageCircle /></Fab></Tooltip>
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}><DialogTitle fontWeight={900}>Nuevo mensaje de WhatsApp</DialogTitle><DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
      <Autocomplete options={clients} value={client} onChange={(_, value) => setClient(value)} getOptionLabel={(item) => `${item.nombre} · ${item.telefono}`} renderInput={(params) => <TextField {...params} label="Cliente" />} />
      <TextField select label="Mensaje guardado" value={templateId} onChange={(e) => setTemplateId(e.target.value)}><MenuItem value="">Escribir manualmente</MenuItem>{templates.map((item) => <MenuItem key={item.id} value={item.id}>{item.nombre}</MenuItem>)}</TextField>
      <TextField multiline minRows={5} label="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} helperText="Podés revisar y editar el texto antes de abrir WhatsApp." />
    </DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="contained" color="success" startIcon={<Send size={17} />} disabled={!client || !message.trim()} onClick={send}>Abrir chat</Button></DialogActions></Dialog>
  </>;
};
