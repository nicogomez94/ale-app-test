import { useState } from 'react';

type Tab = 'auto' | 'moto' | 'hogar' | 'otros';

interface Props {
  onClose: () => void;
}

const WA_NUMBER = '5492994000000'; // replace with actual number

const tabLabels: { key: Tab; label: string; icon: string }[] = [
  { key: 'auto', label: 'Auto', icon: 'fa-car' },
  { key: 'moto', label: 'Moto', icon: 'fa-motorcycle' },
  { key: 'hogar', label: 'Hogar', icon: 'fa-house' },
  { key: 'otros', label: 'Otros seguros', icon: 'fa-shield-halved' },
];

function buildWAUrl(tab: Tab, fields: Record<string, string>): string {
  let text = `Hola! Quiero cotizar un seguro de *${tab.toUpperCase()}*.\n`;
  for (const [key, val] of Object.entries(fields)) {
    if (val) text += `• ${key}: ${val}\n`;
  }
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default function CotizacionModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('auto');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [tipoSeguro, setTipoSeguro] = useState('');
  const [consulta, setConsulta] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = { Nombre: nombre, Teléfono: telefono };
    let extra: Record<string, string> = {};
    if (tab === 'auto' || tab === 'moto') {
      extra = { Marca: marca, Modelo: modelo, Año: anio, Localidad: localidad };
    } else if (tab === 'hogar') {
      extra = { Localidad: localidad, Consulta: consulta };
    } else {
      extra = { 'Tipo de seguro': tipoSeguro, Consulta: consulta };
    }
    window.open(buildWAUrl(tab, { ...base, ...extra }), '_blank');
  }

  return (
    <div className="cotizacion-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cotizacion-modal">
        <div className="cotizacion-modal-header">
          <div>
            <h2>Cotizá tu seguro</h2>
            <p>Completá los datos y te respondemos por WhatsApp</p>
          </div>
          <button className="cotizacion-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        </div>

        <div className="cotizacion-tabs">
          {tabLabels.map((t) => (
            <button
              key={t.key}
              className={`cotizacion-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        <form className="cotizacion-form" onSubmit={handleSubmit}>
          <label>Nombre y apellido</label>
          <input required placeholder="Juan García" value={nombre} onChange={(e) => setNombre(e.target.value)} />

          <label>Teléfono / WhatsApp</label>
          <input required type="tel" placeholder="+54 9 299 4000000" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

          {(tab === 'auto' || tab === 'moto') && (
            <>
              <label>Marca</label>
              <input placeholder="Toyota" value={marca} onChange={(e) => setMarca(e.target.value)} />
              <label>Modelo</label>
              <input placeholder="Corolla XLI" value={modelo} onChange={(e) => setModelo(e.target.value)} />
              <label>Año</label>
              <input type="number" placeholder="2022" value={anio} onChange={(e) => setAnio(e.target.value)} />
              <label>Localidad</label>
              <input placeholder="Neuquén" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
            </>
          )}

          {tab === 'hogar' && (
            <>
              <label>Localidad</label>
              <input placeholder="Neuquén" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
              <label>Consulta / detalles</label>
              <input placeholder="Casa propia, 3 ambientes..." value={consulta} onChange={(e) => setConsulta(e.target.value)} />
            </>
          )}

          {tab === 'otros' && (
            <>
              <label>Tipo de seguro</label>
              <select value={tipoSeguro} onChange={(e) => setTipoSeguro(e.target.value)}>
                <option value="">Seleccioná una opción</option>
                <option>Accidentes personales</option>
                <option>Vida individual</option>
                <option>Comercial / PyME</option>
                <option>ART</option>
                <option>Transporte de mercadería</option>
                <option>Embarcaciones</option>
                <option>Otro</option>
              </select>
              <label>Consulta / detalles</label>
              <input placeholder="Contanos tu caso..." value={consulta} onChange={(e) => setConsulta(e.target.value)} />
            </>
          )}

          <button type="submit" className="cotizacion-submit">
            <i className="fa-brands fa-whatsapp" />
            Enviar consulta por WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}
