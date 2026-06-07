import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { Edit2, Mail, MessageCircle, Trash2 } from 'lucide-react';

type ListingActionsProps = {
  onWhatsApp: () => void;
  onEmail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disableWhatsApp?: boolean;
  disableEmail?: boolean;
  whatsappTitle?: string;
  emailTitle?: string;
};

const ACTION_BUTTON_SX = {
  minWidth: 0,
  minHeight: 34,
  px: 0.85,
  py: 0.5,
  borderRadius: 999,
  justifyContent: 'flex-start',
  fontSize: '0.66rem',
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  '& .MuiButton-startIcon': {
    mr: 0.5,
    ml: 0,
  },
};

export const ListingActions: React.FC<ListingActionsProps> = ({
  onWhatsApp,
  onEmail,
  onEdit,
  onDelete,
  disableWhatsApp = false,
  disableEmail = false,
  whatsappTitle,
  emailTitle,
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(88px, 1fr))',
      gap: 0.75,
      justifyContent: 'flex-end',
      width: '100%',
      maxWidth: 220,
      ml: 'auto',
    }}
  >
    <Tooltip title={whatsappTitle || ''}>
      <span>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="success"
          startIcon={<MessageCircle size={14} />}
          onClick={onWhatsApp}
          disabled={disableWhatsApp}
          sx={ACTION_BUTTON_SX}
        >
          WhatsApp
        </Button>
      </span>
    </Tooltip>
    <Button
      fullWidth
      size="small"
      variant="outlined"
      color="primary"
      startIcon={<Edit2 size={14} />}
      onClick={onEdit}
      sx={ACTION_BUTTON_SX}
    >
      Modificar
    </Button>
    <Tooltip title={emailTitle || ''}>
      <span>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="info"
          startIcon={<Mail size={14} />}
          onClick={onEmail}
          disabled={disableEmail}
          sx={ACTION_BUTTON_SX}
        >
          Mail
        </Button>
      </span>
    </Tooltip>
    <Button
      fullWidth
      size="small"
      variant="outlined"
      color="error"
      startIcon={<Trash2 size={14} />}
      onClick={onDelete}
      sx={ACTION_BUTTON_SX}
    >
      Eliminar
    </Button>
  </Box>
);
