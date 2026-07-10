import React, { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle2, FileSearch, FileUp, Hash, Loader2, UploadCloud } from 'lucide-react';
import { api, PolicyImportBatch, PolicyImportCandidate, PolicyImportData, PolicyVigencia } from '../api';
import {
  ASEGURADORAS,
  GENERAL_RUBRO_OPTIONS,
  PAYMENT_OPTIONS,
  VIGENCIA_OPTIONS,
} from '../data/policyCatalogs';

const moneyFormatter = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function parseAmount(rawValue: string): number | undefined {
  const cleaned = rawValue.replace(/[^\d.,]/g, '');
  if (!cleaned) return undefined;
  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  const decimalSeparator = comma > dot ? ',' : dot >= 0 && cleaned.length - dot <= 3 ? '.' : comma >= 0 ? ',' : '';
  let normalized = cleaned;
  if (decimalSeparator) {
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized.split(thousandSeparator).join('').replace(decimalSeparator, '.');
  } else {
    normalized = normalized.replace(/[.,]/g, '');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatAmount(value?: number | null): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? moneyFormatter.format(value) : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusColor(status: PolicyImportCandidate['status']) {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'READY') return 'primary';
  if (status === 'FAILED') return 'error';
  if (status === 'PROCESSING') return 'info';
  return 'warning';
}

function statusLabel(status: PolicyImportCandidate['status']) {
  switch (status) {
    case 'CONFIRMED': return 'Confirmada';
    case 'READY': return 'Lista';
    case 'FAILED': return 'Falló';
    case 'PROCESSING': return 'Procesando';
    default: return 'Incompleta';
  }
}

function candidateCanConfirm(data: PolicyImportData): boolean {
  return Boolean(
    data.aseguradora &&
    data.rubro &&
    data.numeroPoliza &&
    data.fechaInicio &&
    data.fechaVencimiento &&
    data.clienteNombre &&
    data.clienteDni &&
    data.cobertura &&
    ((typeof data.prima === 'number' && data.prima > 0) || (typeof data.premioTotal === 'number' && data.premioTotal > 0))
  );
}

type CandidateEditorProps = {
  candidate: PolicyImportCandidate;
  documentName: string;
  data: PolicyImportData;
  onChange: (data: PolicyImportData) => void;
  onConfirm: () => void;
  confirming: boolean;
};

const CandidateEditor: React.FC<CandidateEditorProps> = ({ candidate, documentName, data, onChange, onConfirm, confirming }) => {
  const setField = (key: keyof PolicyImportData, value: any) => onChange({ ...data, [key]: value });
  const canConfirm = candidateCanConfirm(data) && candidate.status !== 'CONFIRMED';
  const cuotas = Array.isArray(data.cuotas) ? data.cuotas : [];

  return (
    <Card sx={{ mb: 3, borderRadius: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileSearch size={20} /> {documentName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revisá los datos detectados y completá lo que falte antes de crear la póliza.
            </Typography>
          </Box>
          <Chip color={statusColor(candidate.status) as any} label={statusLabel(candidate.status)} sx={{ fontWeight: 800, alignSelf: { xs: 'flex-start', md: 'center' } }} />
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {(candidate.foundFields || []).map((field) => <Chip key={field} size="small" color="success" variant="outlined" label={`Encontrado: ${field}`} />)}
          {(candidate.missingFields || []).map((field) => <Chip key={field} size="small" color="warning" label={`Falta: ${field}`} />)}
        </Stack>
        {(candidate.warnings || []).length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {candidate.warnings.join(' ')}
          </Alert>
        )}

        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Asegurado / Razón social *" value={data.clienteNombre || ''} onChange={(e) => setField('clienteNombre', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="DNI / CUIT *" value={data.clienteDni || ''} onChange={(e) => setField('clienteDni', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Teléfono" value={data.clienteTelefono || ''} onChange={(e) => setField('clienteTelefono', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth type="email" label="Email" value={data.clienteEmail || ''} onChange={(e) => setField('clienteEmail', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField fullWidth label="Domicilio" value={data.clienteDireccion || ''} onChange={(e) => setField('clienteDireccion', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              freeSolo
              options={ASEGURADORAS}
              value={data.aseguradora || ''}
              onChange={(_, value) => setField('aseguradora', value || '')}
              onInputChange={(_, value) => setField('aseguradora', value || '')}
              renderInput={(params) => <TextField {...params} label="Aseguradora *" />}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              freeSolo
              options={GENERAL_RUBRO_OPTIONS}
              groupBy={(option) => (typeof option === 'string' ? 'Otros' : option.category)}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
              value={GENERAL_RUBRO_OPTIONS.find((option) => option.label === data.rubro) || data.rubro || ''}
              onChange={(_, value) => setField('rubro', typeof value === 'string' ? value : value?.label || '')}
              onInputChange={(_, value) => setField('rubro', value || '')}
              renderInput={(params) => <TextField {...params} label="Rubro *" />}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Número de póliza *" value={data.numeroPoliza || ''} onChange={(e) => setField('numeroPoliza', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Hash size={16} /></InputAdornment> }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Endoso" value={data.endoso || ''} onChange={(e) => setField('endoso', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Cobertura *" value={data.cobertura || ''} onChange={(e) => setField('cobertura', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth type="date" label="Vigencia desde *" InputLabelProps={{ shrink: true }} value={data.fechaInicio || ''} onChange={(e) => setField('fechaInicio', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth type="date" label="Vigencia hasta *" InputLabelProps={{ shrink: true }} value={data.fechaVencimiento || ''} onChange={(e) => setField('fechaVencimiento', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth select label="Vigencia" value={data.vigencia || 'ANUAL'} onChange={(e) => setField('vigencia', e.target.value as PolicyVigencia)}>
              {VIGENCIA_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth select label="Medio de pago" value={data.medioPago || 'Cupon'} onChange={(e) => setField('medioPago', e.target.value)}>
              {PAYMENT_OPTIONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Prima *" value={formatAmount(data.prima)} onChange={(e) => setField('prima', parseAmount(e.target.value))} inputMode="decimal" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Premio total" value={formatAmount(data.premioTotal)} onChange={(e) => setField('premioTotal', parseAmount(e.target.value))} inputMode="decimal" />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Patente" value={data.patente || ''} onChange={(e) => setField('patente', e.target.value.toUpperCase())} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Motor" value={data.motor || ''} onChange={(e) => setField('motor', e.target.value.toUpperCase())} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Chasis" value={data.chasis || ''} onChange={(e) => setField('chasis', e.target.value.toUpperCase())} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="% Comisión" type="number" value={data.porcentajeComision ?? 15} onChange={(e) => setField('porcentajeComision', Number(e.target.value) || 0)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Dirección del riesgo" value={data.direccionRiesgo || ''} onChange={(e) => setField('direccionRiesgo', e.target.value)} />
          </Grid>
        </Grid>

        {cuotas.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Cuotas detectadas: {cuotas.slice(0, 6).map((cuota) => `${cuota.vencimiento || 's/f'} ${cuota.importe ? `$${formatAmount(cuota.importe)}` : ''}`).join(' · ')}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="secondary"
            disabled={!canConfirm || confirming}
            onClick={onConfirm}
            startIcon={confirming ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
          >
            {candidate.status === 'CONFIRMED' ? 'Póliza creada' : confirming ? 'Confirmando…' : 'Confirmar y crear póliza'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const PolicyImportPage: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState<PolicyImportBatch | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PolicyImportData>>({});
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const documentsById = useMemo(() => new Map((batch?.documents || []).map((document) => [document.id, document])), [batch]);

  const chooseFiles = (files?: FileList | null) => {
    const incoming = Array.from(files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    setSelectedFiles(incoming);
    setError(incoming.length ? '' : 'Seleccioná uno o más archivos PDF.');
  };

  const upload = async () => {
    if (!selectedFiles.length) {
      setError('Seleccioná uno o más archivos PDF.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.policyImports.create(selectedFiles);
      setBatch(result.batch);
      setDrafts(Object.fromEntries(result.batch.candidates.map((candidate) => [candidate.id, candidate.data || {}])));
      setSnack('PDF procesado. Revisá los datos antes de confirmar.');
    } catch (err: any) {
      setError(err.message || 'No se pudo importar el PDF.');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (candidate: PolicyImportCandidate) => {
    setConfirmingId(candidate.id);
    setError('');
    try {
      const result = await api.policyImports.confirm(candidate.id, drafts[candidate.id] || candidate.data);
      setBatch((current) => current ? {
        ...current,
        candidates: current.candidates.map((item) => item.id === candidate.id ? result.candidate : item),
      } : current);
      setDrafts((current) => ({ ...current, [candidate.id]: result.candidate.data }));
      setSnack('Póliza creada y PDF original asociado.');
    } catch (err: any) {
      setError(err.message || 'No se pudo confirmar la póliza.');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Importar pólizas PDF
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Subí PDFs digitales con texto seleccionable. Si falta algún dato, completalo acá antes de crear la póliza.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          borderStyle: 'dashed',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UploadCloud size={22} /> Cargar PDF de póliza
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Podés seleccionar varios PDFs; cada archivo genera un borrador independiente.
            </Typography>
            {selectedFiles.length > 0 && (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1.5 }}>
                {selectedFiles.map((file) => <Chip key={`${file.name}-${file.size}`} label={`${file.name} · ${formatBytes(file.size)}`} />)}
              </Stack>
            )}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="label" variant="outlined" startIcon={<FileUp size={18} />}>
              Elegir PDFs
              <input hidden multiple type="file" accept="application/pdf,.pdf" onChange={(event) => chooseFiles(event.target.files)} />
            </Button>
            <Button variant="contained" onClick={upload} disabled={loading || !selectedFiles.length} startIcon={loading ? <Loader2 size={18} /> : <FileSearch size={18} />}>
              {loading ? 'Leyendo…' : 'Leer datos'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {batch?.candidates.map((candidate) => (
        <CandidateEditor
          key={candidate.id}
          candidate={candidate}
          documentName={documentsById.get(candidate.documentId)?.originalName || 'Póliza PDF'}
          data={drafts[candidate.id] || candidate.data || {}}
          onChange={(data) => setDrafts((current) => ({ ...current, [candidate.id]: data }))}
          onConfirm={() => confirm(candidate)}
          confirming={confirmingId === candidate.id}
        />
      ))}

      {!batch && (
        <Alert severity="info">
          El lector no usa IA ni OCR. Si el PDF es una imagen escaneada, el sistema lo va a marcar para completar manualmente.
        </Alert>
      )}

      <Snackbar open={Boolean(snack)} autoHideDuration={3500} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')} sx={{ width: '100%' }}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
};
