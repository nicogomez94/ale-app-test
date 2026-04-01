import { useState, useRef } from 'react';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

const BENEFITS = [
  {
    icon: 'fa-gauge-high',
    title: 'Sistema de gestión incluido',
    desc: 'Acceso completo a AD System: gestioná tu cartera de clientes, pólizas, comisiones y alertas desde un solo lugar.',
  },
  {
    icon: 'fa-percent',
    title: 'Comisiones competitivas',
    desc: 'Esquema de comisiones transparente y competitivo, con pago mensual puntual y sin demoras.',
  },
  {
    icon: 'fa-chalkboard-user',
    title: 'Capacitación continua',
    desc: 'Acceso a materiales de formación, actualizaciones del mercado asegurador y soporte del equipo técnico.',
  },
  {
    icon: 'fa-handshake',
    title: 'Respaldo de marca',
    desc: 'Operá bajo el paraguas de AD SEGUROS con el respaldo comercial, administrativo y jurídico de nuestra organización.',
  },
];

export function ProductoresPage() {
  useScrollAnim();
  const [sent, setSent] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [provincia, setProvincia] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cvName, setCvName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCvName(file.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = `*Consulta de Productor Asesor*\n• Nombre: ${nombre}\n• Teléfono: ${telefono}\n• Email: ${email}\n• Provincia: ${provincia}\n• Experiencia: ${experiencia}\n• Mensaje: ${mensaje}${cvName ? `\n• CV adjunto: ${cvName}` : ''}`;
    window.open(`https://wa.me/5492994000000?text=${encodeURIComponent(text)}`, '_blank');
    setSent(true);
  }

  return (
    <div className="landing-page-root">
      <div className="bg-orbs" aria-hidden="true">
        <span className="orb orb-1" /><span className="orb orb-2" /><span className="orb orb-3" />
        <span className="orb orb-4" /><span className="orb orb-5" />
      </div>
      <div className="page">
        <LandingHeader />

        <main>
          <section className="productores-hero scroll-anim" data-anim="slam-up">
            <span className="eyebrow"><i className="fa-solid fa-briefcase" />Productores Asesores</span>
            <h1>Sumate al equipo de AD SEGUROS</h1>
            <p>
              Si sos productor asesor de seguros o querés serlo, podés operar bajo el respaldo de
              AD SEGUROS con acceso a tecnología, comisiones competitivas y acompañamiento permanente.
            </p>
          </section>

          <div className="benefit-grid scroll-anim" data-anim="slam-up">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="benefit-card scroll-anim"
                data-anim="bounce-left"
                style={{ '--d': `${i * 60}ms` } as React.CSSProperties}
              >
                <i className={`fa-solid ${b.icon}`} />
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="productores-layout scroll-anim" data-anim="slam-up" style={{ marginTop: 56 }}>
            <div>
              <h2 style={{ fontSize: 22, color: '#18344c', marginBottom: 12 }}>¿Cómo funciona?</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { n: '01', t: 'Completá el formulario', d: 'Envianos tu información y nos ponemos en contacto en menos de 48 horas hábiles.' },
                  { n: '02', t: 'Entrevista inicial', d: 'Un integrante del equipo se comunica para presentarte las condiciones y resolver tus dudas.' },
                  { n: '03', t: 'Alta como productor', d: 'Completamos el proceso de alta y configuramos tu cuenta en AD System.' },
                  { n: '04', t: 'Empezá a operar', d: 'Accedés al sistema, tus herramientas y el soporte del equipo desde el primer día.' },
                ].map((step) => (
                  <li key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ background: 'linear-gradient(90deg,#0fb9b7,#11a9b0)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontWeight: 800, fontSize: 13, flexShrink: 0, marginTop: 2 }}>{step.n}</span>
                    <div>
                      <strong style={{ fontSize: 14, color: '#18344c', display: 'block', marginBottom: 2 }}>{step.t}</strong>
                      <span style={{ fontSize: 13, color: '#637082' }}>{step.d}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="productores-form-card scroll-anim" data-anim="bounce-right">
              {sent ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: '#0daeb2', marginBottom: 16, display: 'block' }} />
                  <h3 style={{ marginBottom: 10 }}>¡Consulta enviada!</h3>
                  <p style={{ color: '#637082', fontSize: 14 }}>Te respondemos en breve por WhatsApp.</p>
                  <button className="btn btn-small" style={{ marginTop: 20 }} onClick={() => setSent(false)}>
                    Enviar otra consulta
                  </button>
                </div>
              ) : (
                <>
                  <h2>Quiero ser productor</h2>
                  <p>Completá el formulario y te contactamos en menos de 48 hs hábiles.</p>
                  <form className="productores-form" onSubmit={handleSubmit}>
                    <label>Nombre y apellido</label>
                    <input required placeholder="Juan García" value={nombre} onChange={(e) => setNombre(e.target.value)} />

                    <label>Email</label>
                    <input required type="email" placeholder="juan@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />

                    <label>Teléfono / WhatsApp</label>
                    <input required type="tel" placeholder="+54 9 299 400 0000" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

                    <label>Provincia</label>
                    <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                      <option value="">Seleccioná tu provincia</option>
                      {['Buenos Aires', 'CABA', 'Córdoba', 'Neuquén', 'Río Negro', 'Mendoza', 'Rosario', 'Santa Fe', 'Otra'].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>

                    <label>Años de experiencia en seguros</label>
                    <select value={experiencia} onChange={(e) => setExperiencia(e.target.value)}>
                      <option value="">Seleccioná una opción</option>
                      <option>Sin experiencia (quiero comenzar)</option>
                      <option>Menos de 1 año</option>
                      <option>1 a 3 años</option>
                      <option>3 a 5 años</option>
                      <option>Más de 5 años</option>
                    </select>

                    <label>Mensaje (opcional)</label>
                    <textarea
                      placeholder="Contanos algo sobre vos o tu cartera actual..."
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />

                    <label>CV / Portfolio (opcional)</label>
                    <label
                      className="file-label"
                      onClick={() => fileRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                    >
                      <i className="fa-solid fa-paperclip" />
                      {cvName || 'Adjuntar archivo (.pdf, .doc, .docx)'}
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={handleFile}
                    />

                    <button type="submit" className="btn" style={{ marginTop: 4, justifyContent: 'center' }}>
                      <i className="fa-brands fa-whatsapp" />Enviar por WhatsApp
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
