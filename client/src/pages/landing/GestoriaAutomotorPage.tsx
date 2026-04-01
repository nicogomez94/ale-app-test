import { Link } from 'react-router-dom';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

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
            <span className="eyebrow"><i className="fa-solid fa-id-card" />Gestoria Automotor</span>
            <h1>Tramites automotor rapidos y sin vueltas</h1>
            <p>
              Gestionamos transferencias, denuncias de venta, informes de dominio y tramites registrales
              para que resuelvas todo con acompanamiento profesional.
            </p>
          </section>

          <section className="products-section">
            <h2 className="scroll-anim" data-anim="slam-up">
              <i className="fa-solid fa-list-check" />Servicios de gestoría
            </h2>
            <div className="products-grid">
              <article className="product-card scroll-anim" data-anim="bounce-left" style={{ '--d': '60ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-right-left" /></div>
                <h3>Transferencias</h3>
                <p>Alta, baja y transferencia de dominio con validacion documental y seguimiento completo.</p>
              </article>
              <article className="product-card scroll-anim" data-anim="slam-up" style={{ '--d': '140ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-file-circle-check" /></div>
                <h3>Informes y certificaciones</h3>
                <p>Informe de dominio, libre deuda, verificacion policial y certificaciones necesarias.</p>
              </article>
              <article className="product-card scroll-anim" data-anim="bounce-right" style={{ '--d': '220ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-car-rear" /></div>
                <h3>Denuncia de venta</h3>
                <p>Presentacion y control del tramite para resguardar tu responsabilidad como titular.</p>
              </article>
            </div>
          </section>

          <section className="cta scroll-anim" data-anim="slam-up">
            <div className="cta-copy scroll-anim" data-anim="bounce-right" style={{ '--d': '120ms' } as React.CSSProperties}>
              <span className="eyebrow"><i className="fa-solid fa-star" />AD SEGUROS</span>
              <h2>Inicia tu tramite hoy</h2>
              <p>Escribinos y te indicamos requisitos, costos y plazos segun tu caso.</p>
              <Link className="btn" to="/contacto">
                <i className="fa-solid fa-comments" />Consultar gestoría
              </Link>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
