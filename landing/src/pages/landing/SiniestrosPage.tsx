import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export function SiniestrosPage() {
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
            <span className="eyebrow"><i className="fa-solid fa-scale-balanced" />Asistencia Jurídica</span>
            <h1>Te acompañamos con asesoramiento legal</h1>
            <p>
              Ante un siniestro o accidente, nuestro equipo coordina todo el proceso jurídico y
              de gestión para que no tengas que preocuparte por nada.
            </p>
          </section>

          <div className="asistencia-grid scroll-anim" data-anim="slam-up">
            <article className="asistencia-card scroll-anim" data-anim="bounce-left" style={{ '--d': '80ms' } as React.CSSProperties}>
              <div className="asistencia-card-icon">
                <i className="fa-solid fa-car-burst" />
              </div>
              <h2>Accidente de Tránsito</h2>
              <p>
                Coordinamos la defensa jurídica y la gestión del siniestro vehicular de principio a
                fin: desde la denuncia hasta la resolución con la aseguradora.
              </p>
              <ul>
                <li><i className="fa-solid fa-circle-check" />Asistencia jurídica desde el primer momento</li>
                <li><i className="fa-solid fa-circle-check" />Gestión del peritaje con la aseguradora</li>
                <li><i className="fa-solid fa-circle-check" />Tramitación del reclamo por daños</li>
                <li><i className="fa-solid fa-circle-check" />Coordinación de reparación o indemnización</li>
                <li><i className="fa-solid fa-circle-check" />Seguimiento hasta el cierre del caso</li>
              </ul>
              <div style={{ marginTop: 20 }}>
                <a
                  className="btn btn-small"
                  href="https://wa.me/5492994000000?text=Hola%2C+tuve+un+accidente+de+tr%C3%A1nsito+y+necesito+asistencia."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-brands fa-whatsapp" />Consultar ahora
                </a>
              </div>
            </article>

            <article className="asistencia-card scroll-anim" data-anim="bounce-right" style={{ '--d': '160ms' } as React.CSSProperties}>
              <div className="asistencia-card-icon">
                <i className="fa-solid fa-helmet-safety" />
              </div>
              <h2>Accidente Laboral (ART)</h2>
              <p>
                Te asesoramos en el proceso de denuncia y gestión ante la ART, asegurándonos de que
                recibas la cobertura y las prestaciones que te corresponden por ley.
              </p>
              <ul>
                <li><i className="fa-solid fa-circle-check" />Asesoramiento en denuncia de accidentes laborales</li>
                <li><i className="fa-solid fa-circle-check" />Gestión de prestaciones médicas</li>
                <li><i className="fa-solid fa-circle-check" />Seguimiento de incapacidad laboral temporaria</li>
                <li><i className="fa-solid fa-circle-check" />Tramitación de indemnización por incapacidad</li>
                <li><i className="fa-solid fa-circle-check" />Orientación sobre derechos del trabajador</li>
              </ul>
              <div style={{ marginTop: 20 }}>
                <a
                  className="btn btn-small"
                  href="https://wa.me/5492994000000?text=Hola%2C+tuve+un+accidente+laboral+y+necesito+asesoramiento+de+ART."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-brands fa-whatsapp" />Consultar ahora
                </a>
              </div>
            </article>
          </div>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
