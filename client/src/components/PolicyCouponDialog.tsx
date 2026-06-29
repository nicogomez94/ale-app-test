import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import {
  Download,
  FileCheck2,
  FileUp,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { api, CouponDeliveryStatus, DashboardPolicy, PolicyCoupon } from '../api';

const MAX_BYTES = 10 * 1024 * 1024;

const formatBytes = (bytes: number) => (
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
);

const deliveryVisual: Record<CouponDeliveryStatus, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
  ACCEPTED: { label: 'Aceptado por Meta', color: 'info' },
  SENT: { label: 'Enviado', color: 'info' },
  DELIVERED: { label: 'Entregado', color: 'success' },
  READ: { label: 'Leído', color: 'success' },
  FAILED: { label: 'Falló', color: 'error' },
};

type Props = {
  open: boolean;
  policy: DashboardPolicy | null;
  initialSend?: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onNotify: (severity: 'success' | 'error', message: string) => void;
};

export const PolicyCouponDialog: React.FC<Props> = ({
  open,
  policy,
  initialSend = false,
  onClose,
  onChanged,
  onNotify,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [coupon, setCoupon] = useState<PolicyCoupon | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<'upload' | 'delete' | 'send' | 'download' | null>(null);
  const [error, setError] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    if (!open || !policy) return;
    setCoupon(policy.coupon);
    setSelectedFile(null);
    setError('');
    setLoading(true);
    api.policies.coupon.get(policy.id)
      .then(({ coupon: current }) => {
        setCoupon(current);
        setConfirmSend(Boolean(initialSend && current));
      })
      .catch((err) => setError(err.message || 'No se pudo consultar la cuponera.'))
      .finally(() => setLoading(false));
  }, [open, policy?.id, initialSend]);

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(null);
      setError('Seleccioná un archivo PDF válido.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setSelectedFile(null);
      setError('El PDF debe pesar entre 1 byte y 10 MB.');
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const upload = async () => {
    if (!policy || !selectedFile) return;
    setWorking('upload');
    setError('');
    try {
      const result = await api.policies.coupon.upload(policy.id, selectedFile);
      setCoupon(result.coupon);
      setSelectedFile(null);
      await onChanged();
      onNotify('success', coupon ? 'Cuponera reemplazada correctamente.' : 'Cuponera cargada correctamente.');
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la cuponera.');
    } finally {
      setWorking(null);
    }
  };

  const download = async () => {
    if (!policy || !coupon) return;
    setWorking('download');
    setError('');
    try {
      const blob = await api.policies.coupon.download(policy.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = coupon.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'No se pudo descargar la cuponera.');
    } finally {
      setWorking(null);
    }
  };

  const remove = async () => {
    if (!policy || !coupon || !window.confirm('¿Eliminar la cuponera compartida por todas las cuotas de esta póliza?')) return;
    setWorking('delete');
    setError('');
    try {
      await api.policies.coupon.delete(policy.id);
      setCoupon(null);
      await onChanged();
      onNotify('success', 'Cuponera eliminada.');
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la cuponera.');
    } finally {
      setWorking(null);
    }
  };

  const send = async () => {
    if (!policy || !coupon) return;
    setConfirmSend(false);
    setWorking('send');
    setError('');
    try {
      const result = await api.policies.coupon.sendWhatsApp(policy.id);
      setCoupon((current) => current ? { ...current, lastDelivery: result.delivery } : current);
      await onChanged();
      onNotify('success', 'Meta aceptó el envío de la cuponera por WhatsApp.');
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar la cuponera por WhatsApp.');
    } finally {
      setWorking(null);
    }
  };

  const busy = Boolean(working);
  const delivery = coupon?.lastDelivery ? deliveryVisual[coupon.lastDelivery.status] : null;

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{ bgcolor: '#111936', color: 'white', px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#f14d45', display: 'grid', placeItems: 'center' }}>
              <FileCheck2 size={22} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={900}>Cuponera de póliza</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.72)' }}>
                {policy ? `${policy.cliente} · N.º ${policy.poliza}` : ''}
              </Typography>
            </Box>
            <Button color="inherit" onClick={onClose} disabled={busy} sx={{ minWidth: 38, p: 0.75 }} aria-label="Cerrar">
              <X size={20} />
            </Button>
          </Box>
          {busy && <LinearProgress color={working === 'delete' ? 'error' : 'primary'} />}
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: '#f5f7fb' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
          ) : (
            <>
              {coupon ? (
                <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3, borderColor: '#cfd6e6', boxShadow: '0 10px 30px rgba(17,25,54,.06)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{ width: 46, height: 58, borderRadius: 1.5, bgcolor: '#fff1f0', color: '#c62828', display: 'grid', placeItems: 'center', flex: '0 0 auto', fontWeight: 900 }}>PDF</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>{coupon.originalName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(coupon.sizeBytes)} · actualizada {new Date(coupon.updatedAt).toLocaleString('es-AR')}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        <Chip size="small" icon={<ShieldCheck size={14} />} label="Archivo privado" color="success" variant="outlined" />
                        {delivery && <Chip size="small" label={delivery.label} color={delivery.color} />}
                      </Box>
                      {coupon.lastDelivery?.errorMessage && (
                        <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                          {coupon.lastDelivery.errorMessage}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button startIcon={<Download size={17} />} onClick={download} disabled={busy}>Descargar</Button>
                    <Button color="error" startIcon={<Trash2 size={17} />} onClick={remove} disabled={busy}>Eliminar</Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<MessageCircle size={17} />}
                      onClick={() => setConfirmSend(true)}
                      disabled={busy || !policy?.telefono}
                      sx={{ ml: { sm: 'auto' } }}
                    >
                      Enviar por WhatsApp
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Esta póliza todavía no tiene cuponera. El PDF se compartirá con todas sus cuotas en cascada.
                </Alert>
              )}

              <Box
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}
                sx={{
                  mt: 2,
                  p: 3,
                  border: '2px dashed',
                  borderColor: selectedFile ? '#1b8a5a' : '#aab4cc',
                  bgcolor: selectedFile ? '#edf9f3' : 'white',
                  borderRadius: 3,
                  cursor: busy ? 'default' : 'pointer',
                  textAlign: 'center',
                  transition: 'all .18s ease',
                  '&:hover': busy ? {} : { borderColor: '#263b80', transform: 'translateY(-1px)' },
                }}
              >
                <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => chooseFile(event.target.files?.[0])} />
                {selectedFile ? <RefreshCw size={28} color="#1b8a5a" /> : <FileUp size={28} color="#40517f" />}
                <Typography fontWeight={900} sx={{ mt: 1 }}>
                  {selectedFile ? selectedFile.name : coupon ? 'Reemplazar cuponera' : 'Cargar cuponera PDF'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedFile ? `${formatBytes(selectedFile.size)} · lista para guardar` : 'Arrastrá el archivo o hacé clic · máximo 10 MB'}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'white' }}>
          <Button onClick={onClose} disabled={busy}>Cerrar</Button>
          <Button variant="contained" onClick={upload} disabled={!selectedFile || busy} startIcon={<FileUp size={17} />}>
            {working === 'upload' ? 'Guardando…' : coupon ? 'Reemplazar PDF' : 'Guardar PDF'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmSend} onClose={() => setConfirmSend(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={900}>Confirmar envío real</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Meta enviará el PDF mediante la plantilla aprobada. Esta acción puede generar cargos en la cuenta de WhatsApp Business.
          </Alert>
          <Typography variant="body2"><strong>Destinatario:</strong> {policy?.cliente}</Typography>
          <Typography variant="body2"><strong>Teléfono:</strong> {policy?.telefono || 'Sin teléfono'}</Typography>
          <Typography variant="body2"><strong>Póliza:</strong> {policy?.poliza} · {policy?.aseguradora}</Typography>
          <Typography variant="body2"><strong>Archivo:</strong> {coupon?.originalName}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSend(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={send} startIcon={<MessageCircle size={17} />}>
            Enviar ahora
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
