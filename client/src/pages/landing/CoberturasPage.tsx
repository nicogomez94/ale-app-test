import { Link } from 'react-router-dom';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export function CoberturasPage() {
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
            <span className="eyebrow"><i className="fa-solid fa-file-shield" />Coberturas</span>
            <h1>Coberturas claras y adaptables</h1>
            <p>
              Elegí el plan que mejor se adapta a tu vehículo y presupuesto. Todas nuestras opciones
              incluyen asesoramiento personalizado y gestión completamente digital.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-white" to="/contacto">
                <i className="fa-solid fa-file-signature" />Cotizar ahora
              </Link>
            </div>
          </section>

          <section className="coverage-section">
            <h2 className="scroll-anim" data-anim="slam-up">
              <i className="fa-solid fa-shield-halved" />Planes disponibles
            </h2>
            <p className="scroll-anim" data-anim="slam-up" style={{ '--d': '80ms' } as React.CSSProperties}>
              Tres niveles de protección para tu auto, con precio final transparente y sin sorpresas.
            </p>
            <div className="coverage-grid">
              <article className="coverage-card scroll-anim" data-anim="bounce-left" style={{ '--d': '80ms' } as React.CSSProperties}>
                <span className="coverage-card-tier">Básico</span>
                <h3>Responsabilidad Civil</h3>
                <p>La cobertura mínima obligatoria para circular legalmente, con suma asegurada ampliada frente a terceros.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Daños a terceros (RC)</li>
                  <li><i className="fa-solid fa-circle-check" />Suma asegurada hasta $15.000.000</li>
                  <li><i className="fa-solid fa-circle-check" />Asistencia en ruta básica</li>
                  <li><i className="fa-solid fa-circle-check" />Grúa ante accidente</li>
                  <li><i className="fa-solid fa-circle-check" />Gestoría de documentación</li>
                  <li className="no"><i className="fa-solid fa-xmark" />Robo e incendio</li>
                  <li className="no"><i className="fa-solid fa-xmark" />Daños propios</li>
                  <li className="no"><i className="fa-solid fa-xmark" />Vehículo de reemplazo</li>
                </ul>
                <Link className="btn btn-secondary" to="/contacto">
                  <i className="fa-solid fa-file-signature" />Cotizar este plan
                </Link>
              </article>

              <article className="coverage-card featured scroll-anim" data-anim="slam-up" style={{ '--d': '140ms' } as React.CSSProperties}>
                <span className="coverage-card-badge">Más elegido</span>
                <span className="coverage-card-tier">Recomendado</span>
                <h3>Terceros Completo</h3>
                <p>El equilibrio ideal entre precio y protección. Incluye RC ampliada más coberturas adicionales esenciales.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Responsabilidad civil ampliada</li>
                  <li><i className="fa-solid fa-circle-check" />Robo parcial y total</li>
                  <li><i className="fa-solid fa-circle-check" />Incendio total y parcial</li>
                  <li><i className="fa-solid fa-circle-check" />Rotura de cristales</li>
                  <li><i className="fa-solid fa-circle-check" />Granizo y fenómenos climáticos</li>
                  <li><i className="fa-solid fa-circle-check" />Cerrajería de emergencia</li>
                  <li><i className="fa-solid fa-circle-check" />Accidente al conductor</li>
                  <li className="no"><i className="fa-solid fa-xmark" />Daños propios sin culpa</li>
                </ul>
                <Link className="btn" to="/contacto">
                  <i className="fa-solid fa-file-signature" />Cotizar este plan
                </Link>
              </article>

              <article className="coverage-card scroll-anim" data-anim="bounce-right" style={{ '--d': '200ms' } as React.CSSProperties}>
                <span className="coverage-card-tier">Premium</span>
                <h3>Todo Riesgo</h3>
                <p>La cobertura más completa del mercado. Protección total frente a cualquier siniestro, con y sin culpa.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Todo lo incluido en Terceros Completo</li>
                  <li><i className="fa-solid fa-circle-check" />Daños propios con y sin culpa</li>
                  <li><i className="fa-solid fa-circle-check" />Vehículo de reemplazo</li>
                  <li><i className="fa-solid fa-circle-check" />Asistencia en ruta premium 24/7</li>
                  <li><i className="fa-solid fa-circle-check" />Accesorios y equipos de audio</li>
                  <li><i className="fa-solid fa-circle-check" />Responsabilidad civil $30.000.000</li>
                  <li><i className="fa-solid fa-circle-check" />Gestión de siniestros prioritaria</li>
                  <li><i className="fa-solid fa-circle-check" />Descuento por no siniestralidad</li>
                </ul>
                <Link className="btn" to="/contacto">
                  <i className="fa-solid fa-file-signature" />Cotizar este plan
                </Link>
              </article>
            </div>
          </section>

          <section className="features scroll-anim" data-anim="slam-up" style={{ marginTop: '72px' }}>
            <h2>
              <i className="fa-solid fa-circle-info" />¿Por qué elegirnos?
            </h2>
            <div className="feature-row">
              <article className="feature feature-a scroll-anim" data-anim="bounce-left" style={{ '--d': '60ms' } as React.CSSProperties}>
                <h3>
                  <i className="fa-solid fa-magnifying-glass-dollar" />
                  Mejor precio garantizado
                </h3>
                <p><i className="fa-solid fa-circle-check" />Comparamos entre +10 aseguradoras</p>
                <p><i className="fa-solid fa-circle-check" />Sin costo de intermediación</p>
                <p><i className="fa-solid fa-circle-check" />Precio final sin letra chica</p>
                <Link to="/contacto"><i className="fa-solid fa-arrow-right" />Saber más</Link>
              </article>
              <article className="feature feature-b scroll-anim" data-anim="slam-up" style={{ '--d': '140ms' } as React.CSSProperties}>
                <h3>
                  <i className="fa-solid fa-headset" />
                  Soporte dedicado
                </h3>
                <p><i className="fa-solid fa-circle-check" />Asesor personal asignado</p>
                <p><i className="fa-solid fa-circle-check" />Respuesta en menos de 2 horas</p>
                <p><i className="fa-solid fa-circle-check" />Gestión de siniestros incluida</p>
                <Link to="/contacto"><i className="fa-solid fa-arrow-right" />Contactar</Link>
              </article>
              <article className="feature feature-image scroll-anim" data-anim="zoom-spin" style={{ '--d': '220ms' } as React.CSSProperties}>
                <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80" alt="Revisión de cobertura" />
              </article>
              <article className="feature feature-image scroll-anim" data-anim="flip-in" style={{ '--d': '300ms' } as React.CSSProperties}>
                <img src="https://images.unsplash.com/photo-1542744173-05336fcc7ad4?auto=format&fit=crop&w=800&q=80" alt="Asesor de seguros" />
              </article>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
