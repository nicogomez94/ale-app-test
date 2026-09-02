import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, InputAdornment, Menu, MenuItem,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Building2, Cake, ChevronDown, ChevronUp, Download, FileDown, Mail, MessageCircle, Pencil, Plus, Search, Trash2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { printTableReport } from '../utils/reportExports';
import { PolicyFormDialog } from '../components/PolicyFormDialog';

const fmt = (value?: string) => value ? format(parseISO(value), 'dd/MM/yyyy') : '-';
const status = (policy: any) => policy.pagada
  ? { label: 'PAGADA', bg: '#edf8ed', color: '#25843a' }
  : policy.estado === 'VENCIDA'
    ? { label: 'VENCIDA', bg: '#fff0f0', color: '#dc2d2d' }
    : policy.estado === 'VENCE_PRONTO'
      ? { label: 'VENCE PRONTO', bg: '#fff4df', color: '#f59e0b' }
      : { label: 'VIGENTE', bg: '#edf8ed', color: '#37a654' };
const clientVisual = (policies: any[]) => {
  if (!policies.length) return { bg: '#fff', border: '#d8dce8', pulse: false };
  const pending = policies.filter((policy) => !policy.pagada);
  const relevant = pending.length ? pending : policies;
  if (relevant.some((policy) => policy.estado === 'VENCIDA' && !policy.pagada)) return { bg: '#fff0f0', border: '#dc2d2d', pulse: false };
  if (relevant.some((policy) => policy.estado === 'VENCE_PRONTO' && !policy.pagada)) return { bg: '#fff4df', border: '#f59e0b', pulse: true };
  return { bg: '#edf8ed', border: '#37a654', pulse: false };
};
const phone = (value = '') => value.replace(/\D/g, '');
const age = (value?: string) => {
  if (!value) return null;
  const birth = parseISO(value);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years -= 1;
  return years;
};

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [locality, setLocality] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [policyClient, setPolicyClient] = useState<any | null>(null);
  const form = useRef<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [clientRows, birthdayRows] = await Promise.all([api.clients.list(search, { provincia: province, localidad: locality }), api.clients.birthdays(7)]);
      setClients(clientRows); setBirthdays(birthdayRows);
    } finally { setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(load, 180); return () => window.clearTimeout(timer); }, [search, province, locality]);

  const provinces = useMemo(() => Array.from(new Set(clients.map((c) => c.provincia).filter(Boolean))).sort(), [clients]);
  const allExpanded = clients.length > 0 && clients.every((c) => expanded.has(c.id));
  const toggle = (id: string) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(clients.map((c) => c.id)));

  const openClient = (client?: any) => {
    setEditing(client || null);
    form.current = client ? { ...client, fechaNacimiento: client.fechaNacimiento || '' } : {};
    setOpen(true);
  };
  const save = async () => { if (editing) await api.clients.update(editing.id, form.current); else await api.clients.create(form.current); setOpen(false); await load(); };
  const remove = async (client: any) => { if (!confirm(`¿Eliminar a ${client.nombre}?`)) return; await api.clients.delete(client.id); load(); };
  const loadPolicy = (client: any) => setPolicyClient(client);
  const removePolicy = async (policy: any) => {
    if (!confirm(`¿Eliminar la póliza ${policy.numeroPoliza} y todas sus cuotas?`)) return;
    await api.policies.delete(policy.id);
    await load();
  };
  const whatsapp = (client: any, text?: string) => window.open(`https://wa.me/${phone(client.telefono)}${text ? `?text=${encodeURIComponent(text)}` : ''}`, '_blank', 'noopener,noreferrer');
  const exportPdf = () => printTableReport('Gestión de Clientes', clients, [
    { label: 'Nombre', value: (c) => c.nombre }, { label: 'DNI', value: (c) => c.dni }, { label: 'Nacimiento', value: (c) => fmt(c.fechaNacimiento) },
    { label: 'Teléfono', value: (c) => c.telefono }, { label: 'Email', value: (c) => c.email }, { label: 'Provincia', value: (c) => c.provincia }, { label: 'Localidad', value: (c) => c.localidad },
  ]);
  const exportExcel = async () => { const blob = await api.clients.export(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_PAS_Alert.xlsx'; a.click(); URL.revokeObjectURL(url); };

  return <Box sx={{ minWidth: 0 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'flex-start' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}><Box><Typography variant="h3" sx={{ fontSize: { xs: 32, md: 40 }, fontWeight: 950, letterSpacing: '-1px' }}>Gestión de Clientes</Typography><Typography color="text.secondary">Administra tu cartera de clientes individuales.</Typography></Box><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}><Button variant="outlined" color="error" startIcon={<FileDown size={18} />} onClick={exportPdf}>Exportar PDF</Button><Button variant="outlined" startIcon={<Download size={18} />} onClick={exportExcel}>Exportar Excel</Button><Button variant="contained" startIcon={<Plus />} onClick={(e) => setAnchor(e.currentTarget)}>Nuevo...</Button><Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setAnchor(null); openClient(); }}><User size={17} style={{ marginRight: 8 }} />Nuevo Cliente</MenuItem><MenuItem onClick={() => { setAnchor(null); navigate('/empresas', { state: { openNew: true } }); }}><Building2 size={17} style={{ marginRight: 8 }} />Nueva Empresa</MenuItem></Menu></Box></Box>

    <Card sx={{ mb: 3, bgcolor: '#fff9e8', border: '1px solid #f2dc91', borderRadius: 3, boxShadow: '0 8px 22px rgba(161,124,20,.08)' }}><CardContent><Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: birthdays.length ? 2 : 0 }}><Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#ffc107', color: 'white', display: 'grid', placeItems: 'center' }}><Cake /></Box><Box><Typography variant="h6" fontWeight={950}>🎉 Cumpleaños de esta Semana ({birthdays.length})</Typography><Typography variant="body2" color="#8d741d">{birthdays.length ? '¡Aprovechá para afianzar el vínculo enviándoles un saludo de cumpleaños por WhatsApp!' : 'No hay cumpleaños cargados para los próximos 7 días.'}</Typography></Box></Box>{birthdays.length > 0 && <Grid container spacing={2}>{birthdays.slice(0, 3).map((item) => <Grid key={item.id} size={{ xs: 12, md: 4 }}><Paper sx={{ p: 2, borderRadius: 3 }}><Typography fontWeight={900}>{item.nombre}</Typography><Typography variant="body2" color="text.secondary">🎂 {item.diasRestantes === 0 ? 'Hoy' : item.diasRestantes === 1 ? 'Mañana' : `En ${item.diasRestantes} días`} · <Box component="span" sx={{ color: '#d85a2c', fontWeight: 800 }}>Cumple {item.edad} años</Box></Typography><Button fullWidth size="small" variant="contained" color="success" startIcon={<MessageCircle size={15} />} sx={{ mt: 1.25 }} onClick={() => whatsapp(item, `¡Feliz cumpleaños, ${item.nombre}! Te deseamos un excelente día.`)}>Enviar Saludo WhatsApp</Button></Paper></Grid>)}</Grid>}</CardContent></Card>

    <Card sx={{ mb: 3, borderRadius: 3 }}><CardContent><Grid container spacing={2}><Grid size={{ xs: 12, md: 6 }}><TextField fullWidth placeholder="Buscar por nombre o DNI..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search size={19} /></InputAdornment> }} /></Grid><Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth label="Filtrar por Provincia" value={province} onChange={(e) => setProvince(e.target.value)}><MenuItem value="">Todas</MenuItem>{provinces.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Filtrar por Localidad" placeholder="Ej: Córdoba" value={locality} onChange={(e) => setLocality(e.target.value)} /></Grid></Grid></CardContent></Card>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}><Button variant="outlined" onClick={toggleAll} startIcon={allExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}>{allExpanded ? 'Esconder todas las Pólizas' : 'Desplegar todas las Pólizas'}</Button></Box>
    {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}><Table sx={{ minWidth: 1320 }}><TableHead sx={{ bgcolor: '#222b91' }}><TableRow>{['', 'Nombre', 'DNI', 'F. Nacimiento / Edad', 'Teléfono', 'Email', 'Provincia', 'Localidad', 'C.P.', 'Acciones'].map((h) => <TableCell key={h} sx={{ color: 'white', fontWeight: 900 }}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{clients.map((client) => {
      const isOpen = expanded.has(client.id); const policies = client.polizas || []; const visual = clientVisual(policies); const policyGroups = new Set(policies.map((policy: any) => policy.groupId || policy.id)).size;
      return <React.Fragment key={client.id}><TableRow sx={{ '& > td': { bgcolor: visual.bg }, borderLeft: `6px solid ${visual.border}`, ...(visual.pulse ? { animation: 'clientHeartbeat 1.7s ease-in-out infinite', '@keyframes clientHeartbeat': { '0%, 100%': { filter: 'brightness(1)' }, '15%': { filter: 'brightness(1.06)' }, '30%': { filter: 'brightness(1)' }, '45%': { filter: 'brightness(1.04)' } } } : {}) }}><TableCell><IconButton size="small" onClick={() => toggle(client.id)}>{isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</IconButton></TableCell><TableCell><Typography fontWeight={900}>{client.nombre}</Typography><Typography variant="caption" color="text.secondary">Pólizas: {policyGroups}</Typography></TableCell><TableCell>{client.dni}</TableCell><TableCell><Typography>{fmt(client.fechaNacimiento)}</Typography>{age(client.fechaNacimiento) !== null && <Typography variant="caption" color="warning.dark" fontWeight={800}>{age(client.fechaNacimiento)} años</Typography>}</TableCell><TableCell>{client.telefono}</TableCell><TableCell>{client.email}</TableCell><TableCell>{client.provincia || '-'}</TableCell><TableCell>{client.localidad || '-'}</TableCell><TableCell>{client.cp || '-'}</TableCell><TableCell sx={{ minWidth: 230 }}><Button fullWidth size="small" color="success" variant="contained" startIcon={<Plus size={15} />} onClick={() => loadPolicy(client)}>Cargar Nueva Póliza</Button><Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: .5, mt: .6 }}><Button size="small" color="success" variant="outlined" startIcon={<MessageCircle size={14} />} onClick={() => whatsapp(client)}>WhatsApp</Button><Button size="small" variant="outlined" startIcon={<Pencil size={14} />} onClick={() => openClient(client)}>Modificar</Button><Button size="small" variant="outlined" startIcon={<Mail size={14} />} href={`mailto:${client.email}`}>Mail</Button><Button size="small" color="error" variant="outlined" startIcon={<Trash2 size={14} />} onClick={() => remove(client)}>Eliminar</Button></Box></TableCell></TableRow>
      <TableRow><TableCell colSpan={10} sx={{ p: 0, border: 0 }}><Box sx={{ display: isOpen ? 'block' : 'none', p: 2.5, bgcolor: '#fbfcff' }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}><Typography fontWeight={900} color="primary">Detalle de Pólizas</Typography><Button size="small" color="success" variant="contained" startIcon={<Plus size={15} />} onClick={() => loadPolicy(client)}>Cargar Nueva Póliza para {client.nombre.split(' ')[0]}</Button></Box><Table size="small"><TableHead sx={{ bgcolor: '#222b91' }}><TableRow>{['Póliza / Aseguradora', 'Inicio', 'Vencimiento', 'Vigencia', 'Cuota', 'Pagado', 'Última Gestión', 'Acciones'].map((h) => <TableCell key={h} sx={{ color: 'white', fontWeight: 850 }}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{policies.map((policy: any) => { const st = status(policy); return <TableRow key={policy.id} sx={{ bgcolor: st.bg, borderLeft: `4px solid ${st.color}`, ...(policy.estado === 'VENCE_PRONTO' && !policy.pagada ? { animation: 'clientPolicyHeartbeat 1.7s ease-in-out infinite', '@keyframes clientPolicyHeartbeat': { '0%, 100%': { filter: 'brightness(1)' }, '15%': { filter: 'brightness(1.08)' }, '30%': { filter: 'brightness(1)' } } } : {}) }}><TableCell><Typography fontWeight={850}>N° {policy.numeroPoliza}</Typography><Chip size="small" label={policy.aseguradora} sx={{ bgcolor: '#20298c', color: 'white', fontWeight: 800 }} /><Typography variant="caption" display="block">{policy.rubro}</Typography></TableCell><TableCell>{fmt(policy.fechaInicio)}</TableCell><TableCell>{fmt(policy.fechaVencimiento)}</TableCell><TableCell><Chip size="small" label={st.label} sx={{ bgcolor: st.color, color: 'white', fontWeight: 850 }} /></TableCell><TableCell>{policy.cuotaActual}/{policy.cuotaTotal}<Typography variant="caption" display="block">{policy.medioPago}</Typography></TableCell><TableCell>{policy.pagada ? '✅ SI' : '☐ NO'}</TableCell><TableCell>{policy.ultimaGestionTipo ? `${policy.ultimaGestionTipo} · ${fmt(policy.ultimaGestionFecha)}` : '-'}</TableCell><TableCell><Box sx={{ display: 'flex', gap: .5 }}><Button size="small" color="success" startIcon={<MessageCircle size={14} />} onClick={() => whatsapp(client)}>WhatsApp</Button><Button size="small" color="error" startIcon={<Trash2 size={14} />} onClick={() => removePolicy(policy)}>Eliminar</Button></Box></TableCell></TableRow>; })}{!policies.length && <TableRow><TableCell colSpan={8} align="center">Este cliente todavía no tiene pólizas.</TableCell></TableRow>}</TableBody></Table></Box></TableCell></TableRow></React.Fragment>;
    })}</TableBody></Table></TableContainer>}

    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}><DialogTitle fontWeight={900}>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: .5 }}>{[['Nombre Completo','nombre',12],['DNI / CUIT','dni',6],['Fecha de Nacimiento','fechaNacimiento',6],['Teléfono','telefono',6],['Email','email',6],['Calle','direccion',8],['N°','altura',4],['C.P.','cp',4],['Localidad','localidad',4],['Provincia','provincia',4]].map(([label,key,size]) => <Grid key={String(key)} size={{ xs: 12, sm: Number(size) }}><TextField fullWidth type={key === 'fechaNacimiento' ? 'date' : 'text'} label={label} defaultValue={form.current[String(key)] || ''} InputLabelProps={key === 'fechaNacimiento' ? { shrink: true } : undefined} onChange={(e) => form.current[String(key)] = e.target.value} /></Grid>)}</Grid></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="contained" onClick={save}>Guardar Cliente</Button></DialogActions></Dialog>
    <PolicyFormDialog open={Boolean(policyClient)} mode="CLIENTE" client={policyClient} onClose={() => setPolicyClient(null)} onSaved={async () => { setPolicyClient(null); await load(); }} />
  </Box>;
};
