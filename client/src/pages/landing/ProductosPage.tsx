import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

const SEGUROS = [
  { icon: 'fa-car', title: 'Seguro Automotor', desc: 'Cobertura para autos particulares y comerciales con distintas opciones según tu necesidad.' },
  { icon: 'fa-motorcycle', title: 'Seguros de Motos', desc: 'Protección para motocicletas con planes que incluyen responsabilidad civil y coberturas ampliadas.' },
  { icon: 'fa-truck', title: 'Seguros de Transporte', desc: 'Cobertura para mercaderías y unidades de transporte terrestre en todo el país.' },
  { icon: 'fa-store', title: 'Seguros de Comercio', desc: 'Respaldo para locales y negocios ante incendio, robo y responsabilidad civil.' },
  { icon: 'fa-house', title: 'Seguros de Hogar', desc: 'Protección para viviendas frente a daños, robos y eventos climáticos.' },
  { icon: 'fa-heart', title: 'Seguros de Vida', desc: 'Planes de vida para protección familiar y continuidad económica.' },
  { icon: 'fa-briefcase-medical', title: 'Seguros de ART', desc: 'Cobertura de riesgos del trabajo para empleadores y trabajadores.' },
  { icon: 'fa-person-falling-burst', title: 'Seguros de Accidentes Personales', desc: 'Amparo económico ante accidentes en la vida laboral o cotidiana.' },
  { icon: 'fa-file-signature', title: 'Seguros de Caución', desc: 'Garantías para contratos, alquileres, licitaciones y obligaciones comerciales.' },
  { icon: 'fa-tractor', title: 'Seguros Agropecuarios', desc: 'Cobertura para actividad rural, maquinaria y producción agropecuaria.' },
  { icon: 'fa-shield-heart', title: 'Seguros de Vida Obligatorio', desc: 'Seguro obligatorio de vida para cumplimiento normativo empresarial.' },
  { icon: 'fa-user-doctor', title: 'Responsabilidad Civil Praxis Médica', desc: 'Cobertura específica para profesionales de la salud.' },
  { icon: 'fa-scale-balanced', title: 'Responsabilidad Civil Profesional', desc: 'Protección por reclamos de terceros en el ejercicio profesional.' },
  { icon: 'fa-user-tie', title: 'Responsabilidad Civil para Gerentes y Directores', desc: 'Cobertura para cargos directivos frente a reclamos por decisiones de gestión.' },
  { icon: 'fa-building', title: 'Cobertura Comercial', desc: 'Soluciones integrales para actividades comerciales, PyMEs y empresas.' },
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
            <span className="eyebrow"><i className="fa-solid fa-shield-halved" />Seguros</span>
            <h1>Todos los seguros que necesitás, en un solo lugar</h1>
            <p>
              Te ofrecemos un resumen claro de cada tipo de cobertura para que elijas con información
              completa y asesoramiento profesional.
            </p>
          </section>

          <section className="scroll-anim" data-anim="slam-up">
            <div className="seguros-grid">
              {SEGUROS.map((s, i) => (
                <article
                  key={s.title}
                  className="seguro-card scroll-anim"
                  data-anim="bounce-left"
                  style={{ '--d': `${i * 35}ms` } as React.CSSProperties}
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
              <h3><i className="fa-solid fa-circle-question" style={{ color: '#0baab2', marginRight: 8 }} />¿Qué necesitamos para cotizar su vehículo correctamente?</h3>
              <ul>
                <li>Nombre y apellido del titular</li>
                <li>DNI del titular</li>
                <li>Marca, modelo y año del vehículo</li>
                <li>Localidad y provincia de guarda habitual</li>
                <li>Cobertura deseada</li>
              </ul>
            </div>
            <div className="faq-block">
              <h3><i className="fa-solid fa-file-alt" style={{ color: '#0baab2', marginRight: 8 }} />¿Qué documentación es necesaria para circular con su vehículo?</h3>
              <ul>
                <li>DNI vigente del conductor</li>
                <li>Licencia de conducir vigente</li>
                <li>Cédula verde o cédula azul</li>
                <li>Comprobante de seguro vigente</li>
                <li>Comprobante de RTO/VTV y patente al día</li>
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
                <h3>Asesoramiento claro</h3>
                <p>Te explicamos cada cobertura sin letra chica para que tomes decisiones informadas.</p>
              </div>
              <div className="why-us-card">
                <i className="fa-solid fa-headset" />
                <h3>Atención cercana</h3>
                <p>Un equipo real responde tus dudas por los canales que uses todos los días.</p>
              </div>
              <div className="why-us-card">
                <i className="fa-solid fa-shield" />
                <h3>Respaldo profesional</h3>
                <p>Trabajamos con aseguradoras líderes para ofrecer opciones sólidas y confiables.</p>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
