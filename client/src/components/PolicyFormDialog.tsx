import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { PolicyForm } from '../pages/PolicyForm';

type Props = {
  open: boolean;
  mode?: 'CLIENTE' | 'EMPRESA' | 'VIDA_RETIRO';
  client?: any;
  lifeType?: 'VIDA' | 'RETIRO';
  onClose: () => void;
  onSaved: () => void;
};

export const PolicyFormDialog: React.FC<Props> = ({ open, mode = 'CLIENTE', client, lifeType, onClose, onSaved }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={false}
    fullWidth
    PaperProps={{ sx: { width: '96vw', m: 2, maxHeight: '94vh', borderRadius: 4, overflow: 'hidden' } }}
  >
    <DialogTitle sx={{ fontWeight: 950, borderBottom: '1px solid', borderColor: 'divider', pr: 7 }}>
      Cargar Nueva Póliza
      <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 16, top: 11 }}><X size={21} /></IconButton>
    </DialogTitle>
    <DialogContent sx={{ p: 0, bgcolor: 'background.paper' }}>
      {open && <PolicyForm embedded initialMode={mode} initialLifeType={lifeType} initialClient={client} onSaved={onSaved} />}
    </DialogContent>
  </Dialog>
);
