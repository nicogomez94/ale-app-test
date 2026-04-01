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
            <span className="eyebrow"><i className="fa-solid fa-scale-balanced" />Asistencia Juridica</span>
            <h1>Te acompanamos con asesoramiento legal</h1>
            <p>
              Sabemos que un siniestro es un momento difícil. Por eso, nuestro equipo está disponible
              las 24 horas para guiarte en cada paso del proceso con rapidez y claridad.
            </p>
            <div className="hero-actions">
              <a
                className="btn btn-whatsapp-hero"
                href="https://wa.me/541155551234"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-brands fa-whatsapp" />Reportar por WhatsApp
              </a>
              <a className="btn btn-white" href="tel:+541155551234">
                <i className="fa-solid fa-phone" />Llamar ahora
              </a>
            </div>
          </section>

          <section className="steps-section">
            <h2 className="scroll-anim" data-anim="slam-up">
              <i className="fa-solid fa-list-check" />Como gestionamos tu asistencia juridica
            </h2>
            <p className="scroll-anim" data-anim="slam-up" style={{ '--d': '80ms' } as React.CSSProperties}>
              Un proceso claro, ágil y acompañado en cada etapa.
            </p>
            <div className="steps-row">
              <article className="step-card scroll-anim" data-anim="bounce-left" style={{ '--d': '80ms' } as React.CSSProperties}>
                <div className="step-number">1</div>
                <i className="fa-solid fa-bell step-icon" />
                <h4>Reportá el siniestro</h4>
                <p>Avisanos por WhatsApp, teléfono o email dentro de las 72 hs de ocurrido el hecho. Te respondemos de inmediato.</p>
              </article>
              <article className="step-card scroll-anim" data-anim="slam-up" style={{ '--d': '160ms' } as React.CSSProperties}>
                <div className="step-number">2</div>
                <i className="fa-solid fa-camera step-icon" />
                <h4>Documentá el incidente</h4>
                <p>Te indicamos qué fotos y documentos necesitás: DNI, patente, croquis del accidente y fotos de los daños.</p>
              </article>
              <article className="step-card scroll-anim" data-anim="slam-up" style={{ '--d': '240ms' } as React.CSSProperties}>
                <div className="step-number">3</div>
                <i className="fa-solid fa-magnifying-glass step-icon" />
                <h4>Peritaje y evaluación</h4>
                <p>Coordinamos con la aseguradora el peritaje del vehículo. Te avisamos fecha, hora y lugar del perito designado.</p>
              </article>
              <article className="step-card scroll-anim" data-anim="bounce-right" style={{ '--d': '320ms' } as React.CSSProperties}>
                <div className="step-number">4</div>
                <i className="fa-solid fa-circle-check step-icon" />
                <h4>Resolución y pago</h4>
                <p>Una vez aprobado el siniestro, la aseguradora procede con la reparación o el pago en los plazos estipulados.</p>
              </article>
            </div>
          </section>

          <section className="insight-section scroll-anim" data-anim="slam-up" style={{ marginTop: '72px' }}>
            <div className="insight-copy scroll-anim" data-anim="bounce-left" style={{ '--d': '80ms' } as React.CSSProperties}>
              <span className="insight-kicker">Contacto urgente</span>
              <h3>Estamos disponibles las 24 horas</h3>
              <p>
                Ante cualquier siniestro, no estás solo. Nuestro equipo de gestión te asiste de forma
                inmediata para que el proceso sea lo más simple y rápido posible.
              </p>
              <div className="insight-stats">
                <article>
                  <strong>24/7</strong>
                  <span>disponibilidad para emergencias</span>
                </article>
                <article>
                  <strong>&lt; 48hs</strong>
                  <span>tiempo promedio de respuesta</span>
                </article>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="https://wa.me/541155551234" className="btn" target="_blank" rel="noopener noreferrer" style={{ width: 'fit-content' }}>
                  <i className="fa-brands fa-whatsapp" />WhatsApp: +54 11 5555 1234
                </a>
                <a href="tel:+541166667777" className="btn btn-secondary" style={{ width: 'fit-content' }}>
                  <i className="fa-solid fa-phone" />Línea urgencias: +54 11 6666 7777
                </a>
              </div>
            </div>
            <div className="insight-grid scroll-anim" data-anim="zoom-spin" style={{ '--d': '160ms' } as React.CSSProperties}>
              <img src="https://images.unsplash.com/photo-1547168026-bab22cac18cc?auto=format&fit=crop&w=700&q=80" alt="Accidente de autos" />
              <img src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=700&q=80" alt="Gestión digital" />
              <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=700&q=80" alt="Firma de documentos" />
              <img src="https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=700&q=80" alt="Asesor atendiendo" />
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
