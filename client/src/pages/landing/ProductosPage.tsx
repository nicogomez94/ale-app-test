import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

const SEGUROS = [
  { icon: 'fa-car', title: 'Seguro de Auto', desc: 'Terceros, Todo Riesgo, Robo e Incendio. Cobertura completa para tu vehículo.' },
  { icon: 'fa-motorcycle', title: 'Seguro de Moto', desc: 'Cobertura para motocicletas: responsabilidad civil, robo e incendio.' },
  { icon: 'fa-truck', title: 'Seguro de Camión', desc: 'Protección para vehículos de carga y transporte de mercaderías.' },
  { icon: 'fa-house', title: 'Seguro de Hogar', desc: 'Protegé tu casa ante incendio, robo, desastres naturales y responsabilidad civil.' },
  { icon: 'fa-building', title: 'Seguro Comercial / PyME', desc: 'Cobertura integral para comercios, oficinas y pequeñas y medianas empresas.' },
  { icon: 'fa-person-walking', title: 'Accidentes Personales', desc: 'Cobertura ante accidentes que afecten tu integridad física durante el día a día.' },
  { icon: 'fa-heart-pulse', title: 'Vida Individual', desc: 'Seguro de vida para proteger a tu familia ante una situación inesperada.' },
  { icon: 'fa-people-group', title: 'Vida Colectivo', desc: 'Cobertura grupal de vida para empleados y asociaciones.' },
  { icon: 'fa-briefcase-medical', title: 'ART (Riesgos del Trabajo)', desc: 'Aseguradora de Riesgos del Trabajo para proteger a tus empleados.' },
  { icon: 'fa-anchor', title: 'Embarcaciones', desc: 'Seguro para lanchas, veleros y embarcaciones deportivas o de trabajo.' },
  { icon: 'fa-box', title: 'Transporte de Mercadería', desc: 'Cobertura para cargas durante el transporte terrestre, aéreo o marítimo.' },
  { icon: 'fa-tractor', title: 'Seguros Agropecuarios', desc: 'Cobertura para maquinaria agrícola, ganado y producción del campo.' },
  { icon: 'fa-scale-balanced', title: 'Responsabilidad Civil', desc: 'Protección ante reclamos de terceros por daños materiales o corporales.' },
  { icon: 'fa-umbrella', title: 'Seguro de Caucion', desc: 'Garantías para alquileres, licitaciones y contratos comerciales.' },
  { icon: 'fa-stethoscope', title: 'Seguro de Salud', desc: 'Cobertura médica complementaria para vos y tu grupo familiar.' },
];

export function ProductosPage() {
  useScrollAnim();

  return (
    <div className="landing-page-root">
      <div className="bg-orbs" aria-hidden="true">
        <span className="orb orb-1" /><span className="orb orb-2" /><span className="orb orb-3" />
        <span className="orb orb-4" /><span className="orb orb-5" />
      </div>
      <div className="page">
        <LandingHeader />

        <main>
          <section className="inner-hero scroll-anim" data-anim="slam-up">
            <span className="eyebrow"><i className="fa-solid fa-shield-halved" />Productos</span>
            <h1>Todos los seguros que necesitás, en un solo lugar</h1>
            <p>
              Trabajamos con las principales aseguradoras del mercado para ofrecerte las mejores
              coberturas a precios competitivos. Asesoramiento personalizado sin costo.
            </p>
          </section>

          <section className="scroll-anim" data-anim="slam-up">
            <div className="seguros-grid">
              {SEGUROS.map((s, i) => (
                <article
                  key={s.title}
                  className="seguro-card scroll-anim"
                  data-anim="bounce-left"
                  style={{ '--d': `${i * 40}ms` } as React.CSSProperties}
                >
                  <i className={`fa-solid ${s.icon}`} />
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="faq-grid scroll-anim" data-anim="slam-up">
            <div className="faq-block">
              <h3><i className="fa-solid fa-circle-question" style={{ color: '#0baab2', marginRight: 8 }} />¿Qué necesitamos para cotizar?</h3>
              <ul>
                <li>Nombre completo y DNI del asegurado</li>
                <li>Datos del bien a asegurar (patente, año, modelo para autos)</li>
                <li>Localidad de guarda o uso habitual</li>
                <li>Cobertura deseada (Terceros, Todo Riesgo, etc.)</li>
                <li>Uso del vehículo (particular, comercial, etc.)</li>
              </ul>
            </div>
            <div className="faq-block">
              <h3><i className="fa-solid fa-file-alt" style={{ color: '#0baab2', marginRight: 8 }} />¿Qué documentación necesaria?</h3>
              <ul>
                <li>DNI del titular del seguro</li>
                <li>Título del vehículo (para seguros automotores)</li>
                <li>Número de VIN / chasis (en algunos casos)</li>
                <li>Constancia de CUIT/CUIL (para personas jurídicas)</li>
                <li>Declaración jurada de uso (para seguros comerciales)</li>
              </ul>
            </div>
          </div>

          <section className="scroll-anim" data-anim="slam-up" style={{ marginTop: '48px' }}>
            <h2 style={{ fontSize: 20, color: '#18344c', marginBottom: 20 }}>
              <i className="fa-solid fa-star" style={{ color: '#0baab2', marginRight: 8 }} />¿Por qué elegirnos?
            </h2>
            <div className="why-us-grid">
              <div className="why-us-card">
                <i className="fa-solid fa-magnifying-glass-dollar" />
                <h3>Mejor precio garantizado</h3>
                <p>Comparamos entre múltiples aseguradoras para darte la mejor relación cobertura-precio.</p>
              </div>
              <div className="why-us-card">
                <i className="fa-solid fa-headset" />
                <h3>Asesoramiento sin costo</h3>
                <p>Nuestros productores te acompañan en cada decisión sin cargo adicional.</p>
              </div>
              <div className="why-us-card">
                <i className="fa-solid fa-clock-rotate-left" />
                <h3>Gestión rápida de siniestros</h3>
                <p>Te asistimos con la denuncia y seguimiento hasta la resolución de tu caso.</p>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
