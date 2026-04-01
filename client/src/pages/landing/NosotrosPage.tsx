import { Link } from 'react-router-dom';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export function NosotrosPage() {
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
            <span className="eyebrow"><i className="fa-solid fa-users" />Nosotros</span>
            <h1>Más de 10 años cuidando lo que más importa</h1>
            <p>
              Somos una productora de seguros independiente con sede en Buenos Aires. Trabajamos con
              las principales compañías del mercado para ofrecerte la mejor cobertura al mejor precio.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-white" to="/contacto">
                <i className="fa-solid fa-comments" />Hablar con el equipo
              </Link>
            </div>
          </section>

          <section className="cta scroll-anim" data-anim="slam-up" style={{ marginTop: '60px' }}>
            <div className="cta-image scroll-anim" data-anim="bounce-left" style={{ '--d': '90ms' } as React.CSSProperties}>
              <img
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
                alt="Equipo AD SEGUROS"
              />
            </div>
            <div className="cta-copy scroll-anim" data-anim="bounce-right" style={{ '--d': '180ms' } as React.CSSProperties}>
              <span className="eyebrow"><i className="fa-solid fa-star" />Nuestra historia</span>
              <h2>Nacimos para simplificar los seguros</h2>
              <p>
                AD SEGUROS fue fundada en 2015 con una misión simple: que contratar un seguro sea
                una experiencia clara, rápida y confiable. Sin burocracia ni letra chica.
              </p>
              <p>
                En más de 10 años, asesoramos a más de 4.000 clientes y gestionamos miles de
                siniestros con resultados exitosos. Hoy somos referentes en seguros automotores
                en la Ciudad de Buenos Aires y el Gran Buenos Aires.
              </p>
              <div className="insight-stats" style={{ marginTop: '18px' }}>
                <article>
                  <strong>+4.000</strong>
                  <span>clientes activos en todo el país</span>
                </article>
                <article>
                  <strong>10+</strong>
                  <span>años de experiencia en el sector</span>
                </article>
              </div>
            </div>
          </section>

          <section className="values-section">
            <h2 className="scroll-anim" data-anim="slam-up">
              <i className="fa-solid fa-compass" />Nuestros valores
            </h2>
            <div className="values-grid">
              <article className="value-card scroll-anim" data-anim="bounce-left" style={{ '--d': '60ms' } as React.CSSProperties}>
                <i className="fa-solid fa-eye" />
                <h4>Transparencia</h4>
                <p>Sin letra chica. Te explicamos cada cláusula y te mostramos todas las opciones disponibles para que decidás con información completa.</p>
              </article>
              <article className="value-card scroll-anim" data-anim="slam-up" style={{ '--d': '130ms' } as React.CSSProperties}>
                <i className="fa-solid fa-handshake" />
                <h4>Compromiso</h4>
                <p>Te acompañamos antes, durante y después de contratar. Cuando más nos necesitás, estamos ahí para resolver rápido.</p>
              </article>
              <article className="value-card scroll-anim" data-anim="slam-up" style={{ '--d': '200ms' } as React.CSSProperties}>
                <i className="fa-solid fa-bolt" />
                <h4>Agilidad</h4>
                <p>Gestionamos pólizas, renovaciones y siniestros de forma digital y sin demoras innecesarias. Tu tiempo nos importa.</p>
              </article>
              <article className="value-card scroll-anim" data-anim="bounce-right" style={{ '--d': '270ms' } as React.CSSProperties}>
                <i className="fa-solid fa-heart" />
                <h4>Cercanía</h4>
                <p>Respondemos por WhatsApp, teléfono o email. No sos un número de póliza: tenés un asesor que conoce tu historia.</p>
              </article>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
