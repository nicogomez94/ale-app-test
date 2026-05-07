import { Link } from 'react-router-dom';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export function PreguntasFrecuentesPage() {
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
            <span className="eyebrow"><i className="fa-solid fa-circle-question" />Preguntas frecuentes</span>
            <h1>Sección en construcción</h1>
            <p>
              Estamos preparando esta sección para responder las consultas más comunes de forma clara y ordenada.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-white" to="/contacto">
                <i className="fa-solid fa-comments" />Hacer una consulta
              </Link>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
