import { Link } from 'react-router-dom';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export function LandingPage() {
  useScrollAnim();

  return (
    <div className="landing-page-root">
      <div className="bg-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="orb orb-4" />
        <span className="orb orb-5" />
      </div>
      <div className="page">
        <LandingHeader />

        <main>
          <section className="hero">
            <div className="hero-copy scroll-anim" data-anim="bounce-left">
              <h1>
                <i className="fa-solid fa-car-burst" />
                Seguro automotor
                <br />
                con respaldo
                <br />
                profesional
              </h1>
              <p className="scroll-anim" data-anim="slam-up" style={{ '--d': '120ms' } as React.CSSProperties}>
                En AD SEGUROS te ayudamos a encontrar la poliza ideal para tu auto, con asesoramiento cercano, claro y
                personalizado.
              </p>
              <p className="scroll-anim" data-anim="slam-up" style={{ '--d': '220ms' } as React.CSSProperties}>
                Trabajamos con aseguradoras lideres para ofrecer coberturas completas, terceros, robo, incendio y
                asistencia en ruta. Cotiza en minutos y protege tu vehiculo con el plan que mejor se adapta a vos.
              </p>
              <div className="hero-actions scroll-anim" data-anim="slam-up" style={{ '--d': '320ms' } as React.CSSProperties}>
                <Link className="btn" to="/coberturas">
                  <i className="fa-solid fa-shield-heart" />
                  Ver coberturas
                </Link>
                <Link className="btn btn-secondary" to="/app/login">
                  Ir al sistema
                </Link>
              </div>
            </div>

            <div className="hero-art scroll-anim" data-anim="zoom-spin" style={{ '--d': '100ms' } as React.CSSProperties}>
              <div className="hero-circle">
                <img
                  src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80"
                  alt="Paisaje aseguradora"
                />
              </div>
              <img
                className="hero-car"
                src="https://www.pngall.com/wp-content/uploads/5/Vehicle-Red-Car-Transparent.png"
                alt="Auto asegurado"
              />
              <img
                className="hero-person"
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=700&q=80"
                alt="Asesor de seguros"
              />
            </div>
          </section>

          <section className="features scroll-anim" data-anim="slam-up">
            <h2>
              <i className="fa-solid fa-medal" />
              Servicios de AD SEGUROS
            </h2>
            <div className="feature-row">
              <article className="feature feature-a scroll-anim" data-anim="bounce-left" style={{ '--d': '80ms' } as React.CSSProperties}>
                <h3>
                  <i className="fa-solid fa-user-shield" />
                  Asesoria
                  <br />
                  Integral
                </h3>
                <p><i className="fa-solid fa-circle-check" />Analisis de riesgo sin costo</p>
                <p><i className="fa-solid fa-circle-check" />Comparacion entre companias</p>
                <p><i className="fa-solid fa-circle-check" />Recomendacion segun tu perfil</p>
                <Link to="/quienes-somos">
                  <i className="fa-solid fa-arrow-right" />Conoce mas
                </Link>
              </article>

              <article className="feature feature-b scroll-anim" data-anim="slam-up" style={{ '--d': '180ms' } as React.CSSProperties}>
                <h3>
                  <i className="fa-solid fa-bolt" />
                  Gestion
                  <br />
                  Rapida
                </h3>
                <p><i className="fa-solid fa-circle-check" />Cotizacion online en minutos</p>
                <p><i className="fa-solid fa-circle-check" />Emision y renovacion digital</p>
                <p><i className="fa-solid fa-circle-check" />Soporte directo por WhatsApp</p>
                <Link to="/contacto">
                  <i className="fa-solid fa-arrow-right" />Ver detalle
                </Link>
              </article>

              <article className="feature feature-image scroll-anim" data-anim="zoom-spin" style={{ '--d': '260ms' } as React.CSSProperties}>
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
                  alt="Cliente cotizando seguro"
                />
              </article>

              <article className="feature feature-image scroll-anim" data-anim="flip-in" style={{ '--d': '340ms' } as React.CSSProperties}>
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80"
                  alt="Clienta gestionando poliza"
                />
              </article>
            </div>
          </section>

          {/* ── AD System Banner ── */}
          <div className="pas-alert-banner scroll-anim" data-anim="slam-up">
            <div className="pas-alert-icon">
              <i className="fa-solid fa-gauge-high" />
            </div>
            <div className="pas-alert-copy">
              <h2>AD System — Gestión para Productores Asesores</h2>
              <p>
                Plataforma digital exclusiva para productores de AD SEGUROS. Gestioná tus clientes, pólizas,
                comisiones y siniestros desde un solo lugar.
              </p>
              <ul>
                <li><i className="fa-solid fa-circle-check" />Cartera de clientes</li>
                <li><i className="fa-solid fa-circle-check" />Control de pólizas</li>
                <li><i className="fa-solid fa-circle-check" />Seguimiento de comisiones</li>
                <li><i className="fa-solid fa-circle-check" />Alertas de vencimiento</li>
              </ul>
              <div className="pas-alert-actions">
                <a className="btn btn-light btn-small" href="/app/login">
                  <i className="fa-solid fa-arrow-right-to-bracket" />Ir al sistema
                </a>
                <a className="btn btn-outline-light btn-small" href="/productores">
                  <i className="fa-solid fa-briefcase" />Soy productor
                </a>
              </div>
            </div>
          </div>

          <section className="cta scroll-anim" data-anim="slam-up">
            <div className="cta-image scroll-anim" data-anim="bounce-left" style={{ '--d': '90ms' } as React.CSSProperties}>
              <img
                src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80"
                alt="Familia revisando cobertura"
              />
            </div>
            <div className="cta-copy scroll-anim" data-anim="bounce-right" style={{ '--d': '180ms' } as React.CSSProperties}>
              <span className="eyebrow">
                <i className="fa-solid fa-star" />AD SEGUROS
              </span>
              <h2>
                Contrata tu seguro de auto
                <br />
                con acompanamiento real
              </h2>
              <p>Te acompanamos antes, durante y despues de contratar tu cobertura.</p>
              <p>
                Nuestro equipo responde tus consultas, gestiona tus tramites y te asiste en siniestros para que tengas
                una experiencia simple y sin vueltas.
              </p>
              <Link className="btn" to="/contacto">
                <i className="fa-solid fa-headset" />Solicitar asesoramiento
              </Link>
            </div>
          </section>

          <section className="insight-section scroll-anim" data-anim="slam-up">
            <div className="insight-copy scroll-anim" data-anim="bounce-left" style={{ '--d': '80ms' } as React.CSSProperties}>
              <span className="insight-kicker">Resultados</span>
              <h3>Conversion y confianza</h3>
              <p>
                Cada propuesta se analiza con foco en cobertura real y costo final para que tomes decisiones claras, con
                acompanamiento de principio a fin.
              </p>
              <div className="insight-stats">
                <article>
                  <strong>55%</strong>
                  <span>mas renovaciones anuales</span>
                </article>
                <article>
                  <strong>40%</strong>
                  <span>menos tiempo de gestion</span>
                </article>
              </div>
            </div>
            <div className="insight-grid scroll-anim" data-anim="zoom-spin" style={{ '--d': '160ms' } as React.CSSProperties}>
              <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=80" alt="Equipo asesorando clientes" />
              <img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&q=80" alt="Asesora de seguros" />
              <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=700&q=80" alt="Firma de poliza" />
              <img src="https://images.unsplash.com/photo-1515168833906-d2a3b82b302a?auto=format&fit=crop&w=700&q=80" alt="Atencion al cliente" />
              <img src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=700&q=80" alt="Gestion digital" />
              <img src="https://images.unsplash.com/photo-1542744173-05336fcc7ad4?auto=format&fit=crop&w=700&q=80" alt="Reunion comercial" />
              <img src="https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=700&q=80" alt="Documentacion aseguradora" />
              <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=700&q=80" alt="Auto protegido" />
            </div>
          </section>

          <section className="insight-section insight-section-alt scroll-anim" data-anim="slam-up">
            <div className="insight-copy scroll-anim" data-anim="bounce-right" style={{ '--d': '80ms' } as React.CSSProperties}>
              <span className="insight-kicker">Experiencia</span>
              <h3>Respuesta en todo momento</h3>
              <p>
                Desde la cotizacion hasta un siniestro, tenes un equipo real detras para resolver rapido, explicar cada
                paso y cuidar tu tranquilidad.
              </p>
              <div className="insight-stats">
                <article>
                  <strong>24/7</strong>
                  <span>seguimiento por WhatsApp</span>
                </article>
                <article>
                  <strong>+1200</strong>
                  <span>clientes asesorados en el ano</span>
                </article>
              </div>
            </div>
            <div className="insight-grid scroll-anim" data-anim="zoom-spin" style={{ '--d': '160ms' } as React.CSSProperties}>
              <img src="https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=700&q=80" alt="Asesora atendiendo llamada" />
              <img src="https://images.unsplash.com/photo-1573497491765-dccce02b29df?auto=format&fit=crop&w=700&q=80" alt="Consultora de seguros" />
              <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=700&q=80" alt="Equipo operativo" />
              <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=700&q=80" alt="Atencion personalizada" />
              <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=700&q=80" alt="Revision de cobertura" />
              <img src="https://images.unsplash.com/photo-1523289333742-be1143f6b766?auto=format&fit=crop&w=700&q=80" alt="Firma de contrato" />
              <img src="https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?auto=format&fit=crop&w=700&q=80" alt="Documentacion de poliza" />
              <img src="https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=700&q=80" alt="Asistencia para auto" />
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
