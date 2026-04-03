import { useState } from 'react';

type Tab = 'auto' | 'moto' | 'hogar' | 'otros';

interface Props {
  onClose: () => void;
}

const WA_NUMBER = '5492994000000';

const tabLabels: { key: Tab; label: string; icon: string }[] = [
  { key: 'auto', label: 'Auto', icon: 'fa-car' },
  { key: 'moto', label: 'Moto', icon: 'fa-motorcycle' },
  { key: 'hogar', label: 'Hogar', icon: 'fa-house' },
  { key: 'otros', label: 'Otros seguros', icon: 'fa-shield-halved' },
];

function openWhatsApp(message: string): void {
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

export default function CotizacionModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('auto');
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [localidadAutoMoto, setLocalidadAutoMoto] = useState('');
  const [provinciaAutoMoto, setProvinciaAutoMoto] = useState('');

  const [tipoVivienda, setTipoVivienda] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [localidadHogar, setLocalidadHogar] = useState('');
  const [provinciaHogar, setProvinciaHogar] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (tab === 'auto' || tab === 'moto') {
      const mensaje = [
        `Hola, quiero cotizar un seguro de *${tab === 'auto' ? 'AUTO' : 'MOTO'}*.`,
        `• Nombre y apellido: ${nombre}`,
        `• DNI: ${dni}`,
        `• Marca: ${marca}`,
        `• Modelo: ${modelo}`,
        `• Año: ${anio}`,
        `• Localidad: ${localidadAutoMoto}`,
        `• Provincia: ${provinciaAutoMoto}`,
      ].join('\n');
      openWhatsApp(mensaje);
      return;
    }

    const mensajeHogar = [
      'Hola, quiero cotizar un seguro de *HOGAR*.',
      `• Nombre y apellido: ${nombre}`,
      `• DNI: ${dni}`,
      `• Tipo de vivienda: ${tipoVivienda}`,
      `• Superficie cubierta (m²): ${superficie}`,
      `• Localidad: ${localidadHogar}`,
      `• Provincia: ${provinciaHogar}`,
    ].join('\n');

    openWhatsApp(mensajeHogar);
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

        {tab === 'otros' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, color: '#4a6279', fontSize: 14, lineHeight: 1.5 }}>
              Para otros tipos de seguros, escribinos por WhatsApp y te asesoramos de forma personalizada.
            </p>
            <button
              type="button"
              className="cotizacion-submit"
              onClick={() => openWhatsApp('Hola, quiero cotizar otro tipo de seguro.')}
            >
              <i className="fa-brands fa-whatsapp" />
              Consultar por WhatsApp
            </button>
          </div>
        ) : (
          <form className="cotizacion-form" onSubmit={handleSubmit}>
            <label>Nombre y apellido</label>
            <input required placeholder="Juan García" value={nombre} onChange={(e) => setNombre(e.target.value)} />

            <label>DNI</label>
            <input required placeholder="30111222" value={dni} onChange={(e) => setDni(e.target.value)} />

            {(tab === 'auto' || tab === 'moto') && (
              <>
                <label>Marca</label>
                <input required placeholder="Toyota" value={marca} onChange={(e) => setMarca(e.target.value)} />
                <label>Modelo</label>
                <input required placeholder="Corolla XLI" value={modelo} onChange={(e) => setModelo(e.target.value)} />
                <label>Año</label>
                <input required type="number" placeholder="2022" value={anio} onChange={(e) => setAnio(e.target.value)} />
                <label>Localidad</label>
                <input required placeholder="Neuquén" value={localidadAutoMoto} onChange={(e) => setLocalidadAutoMoto(e.target.value)} />
                <label>Provincia</label>
                <input required placeholder="Neuquén" value={provinciaAutoMoto} onChange={(e) => setProvinciaAutoMoto(e.target.value)} />
              </>
            )}

            {tab === 'hogar' && (
              <>
                <label>Tipo de vivienda</label>
                <input required placeholder="Casa / Departamento" value={tipoVivienda} onChange={(e) => setTipoVivienda(e.target.value)} />
                <label>Superficie cubierta (m²)</label>
                <input required type="number" placeholder="120" value={superficie} onChange={(e) => setSuperficie(e.target.value)} />
                <label>Localidad</label>
                <input required placeholder="Neuquén" value={localidadHogar} onChange={(e) => setLocalidadHogar(e.target.value)} />
                <label>Provincia</label>
                <input required placeholder="Neuquén" value={provinciaHogar} onChange={(e) => setProvinciaHogar(e.target.value)} />
              </>
            )}

            <button type="submit" className="cotizacion-submit">
              <i className="fa-brands fa-whatsapp" />
              Enviar consulta por WhatsApp
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
