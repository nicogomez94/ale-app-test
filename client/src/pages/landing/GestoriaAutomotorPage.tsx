import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

const TRAMITES = [
  'Cédula de Autorizado (Cédula azul).',
  'Informe de deuda de patentes, constancia de pagos y liquidaciones de deuda.',
  'Informe de infracciones.',
  'Informe Histórico de Dominio.',
  'Denuncia de Venta/Compra.',
  'Libre prenda, embargo e inhibición.',
  'Duplicado de Cédula Verde.',
  'Asesoramiento general sobre documentación de automotores.',
  'Patentamiento de 0 Km.',
  'Transferencias.',
  'Transferencias por sucesión y/o remates u oficios judiciales.',
  'Confección del Certificado de Transferencia Automotor (CETA).',
  'Bajas (por robo, hurto, destrucción, desarme).',
  'Duplicados de Título de Propiedad.',
];

export function GestoriaAutomotorPage() {
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
            <span className="eyebrow"><i className="fa-solid fa-id-card" />Gestoría Automotor</span>
            <h1>Trámites automotor con respaldo profesional</h1>
            <p>
              Gestionamos trámites registrales de vehículos de punta a punta para que resuelvas todo
              rápido, con acompañamiento claro y seguimiento personalizado.
            </p>
          </section>

          <div className="gestoria-section scroll-anim" data-anim="slam-up">
            <h2><i className="fa-solid fa-folder-open" style={{ color: '#0baab2', marginRight: 8 }} />Nos encargamos de:</h2>
            <ul className="gestoria-list">
              {TRAMITES.map((item) => (
                <li key={item}><i className="fa-solid fa-circle-check" />{item}</li>
              ))}
            </ul>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48, marginBottom: 40 }} className="scroll-anim" data-anim="slam-up">
            <p style={{ fontSize: 15, color: '#4a6279', marginBottom: 18 }}>
              ¿Necesitás asesoramiento para un trámite específico? Escribinos y te ayudamos.
            </p>
            <a
              className="btn"
              href="https://wa.me/5492994000000?text=Hola%2C+necesito+asesoramiento+sobre+gestor%C3%ADa+automotor."
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-whatsapp" />Consultar ahora
            </a>
          </div>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
