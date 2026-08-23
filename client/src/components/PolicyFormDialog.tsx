import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { PolicyForm } from '../pages/PolicyForm';

type Props = {
  open: boolean;
  mode?: 'CLIENTE' | 'EMPRESA' | 'VIDA_RETIRO';
  client?: any;
  onClose: () => void;
  onSaved: () => void;
};

export const PolicyFormDialog: React.FC<Props> = ({ open, mode = 'CLIENTE', client, onClose, onSaved }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xl"
    fullWidth
    PaperProps={{ sx: { width: 'min(1320px, 96vw)', maxHeight: '94vh', borderRadius: 4, overflow: 'hidden' } }}
  >
    <DialogTitle sx={{ fontWeight: 950, borderBottom: '1px solid', borderColor: 'divider', pr: 7 }}>
      Cargar Nueva Póliza
      <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 16, top: 11 }}><X size={21} /></IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ p: 0, bgcolor: '#f7f8fc' }}>
      {open && <PolicyForm embedded initialMode={mode} initialClient={client} onSaved={onSaved} />}
    </DialogContent>
  </Dialog>
);
