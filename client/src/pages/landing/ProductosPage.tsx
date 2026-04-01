import { Link } from 'react-router-dom';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

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
            <span className="eyebrow"><i className="fa-solid fa-star" />Nuestros productos</span>
            <h1>Seguros para cada etapa de tu vida</h1>
            <p>
              Ofrecemos una línea completa de seguros personales y comerciales, con el respaldo de las
              principales compañías aseguradoras del mercado argentino.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-white" to="/contacto">
                <i className="fa-solid fa-headset" />Consultar ahora
              </Link>
              <Link className="btn btn-white btn-secondary" to="/coberturas">
                <i className="fa-solid fa-file-shield" />Ver coberturas
              </Link>
            </div>
          </section>

          <section className="products-section">
            <h2 className="scroll-anim" data-anim="slam-up">
              <i className="fa-solid fa-medal" />Todo lo que cubrimos
            </h2>
            <div className="products-grid">
              <article className="product-card scroll-anim" data-anim="bounce-left" style={{ '--d': '60ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-car-side" /></div>
                <h3>Seguro Automotor</h3>
                <p>Protegé tu vehículo con coberturas completas, desde responsabilidad civil hasta todo riesgo. Trabajamos con las mejores aseguradoras para ofrecerte el precio más conveniente.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Responsabilidad civil obligatoria</li>
                  <li><i className="fa-solid fa-circle-check" />Cobertura contra robo e incendio</li>
                  <li><i className="fa-solid fa-circle-check" />Asistencia en ruta 24/7</li>
                  <li><i className="fa-solid fa-circle-check" />Accidente al conductor incluido</li>
                  <li><i className="fa-solid fa-circle-check" />Vehículo de reemplazo disponible</li>
                </ul>
                <Link className="product-card-link" to="/coberturas"><i className="fa-solid fa-arrow-right" />Ver coberturas</Link>
              </article>

              <article className="product-card scroll-anim" data-anim="bounce-right" style={{ '--d': '120ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-house-chimney" /></div>
                <h3>Seguro de Hogar</h3>
                <p>Cuidamos tu propiedad con coberturas que incluyen incendio, robo, daños por agua y responsabilidad civil frente a terceros, adaptadas a tu tipo de vivienda.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Incendio y daños estructurales</li>
                  <li><i className="fa-solid fa-circle-check" />Robo con violencia y hurto simple</li>
                  <li><i className="fa-solid fa-circle-check" />Daños eléctricos y por agua</li>
                  <li><i className="fa-solid fa-circle-check" />Responsabilidad civil del hogar</li>
                  <li><i className="fa-solid fa-circle-check" />Asistencia del hogar 24 horas</li>
                </ul>
                <Link className="product-card-link" to="/contacto"><i className="fa-solid fa-arrow-right" />Consultar</Link>
              </article>

              <article className="product-card scroll-anim" data-anim="bounce-left" style={{ '--d': '180ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-heart-pulse" /></div>
                <h3>Accidentes Personales y Vida</h3>
                <p>Protegé a tu familia con coberturas de accidentes personales y seguro de vida. Planes flexibles para individuos, familias y grupos empresariales.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Fallecimiento por cualquier causa</li>
                  <li><i className="fa-solid fa-circle-check" />Invalidez total y permanente</li>
                  <li><i className="fa-solid fa-circle-check" />Gastos médicos por accidente</li>
                  <li><i className="fa-solid fa-circle-check" />Sepelio y asistencia familiar</li>
                  <li><i className="fa-solid fa-circle-check" />Incapacidad laboral temporal</li>
                </ul>
                <Link className="product-card-link" to="/contacto"><i className="fa-solid fa-arrow-right" />Cotizar</Link>
              </article>

              <article className="product-card scroll-anim" data-anim="bounce-right" style={{ '--d': '240ms' } as React.CSSProperties}>
                <div className="product-card-icon"><i className="fa-solid fa-store" /></div>
                <h3>Seguro Comercial</h3>
                <p>Soluciones integrales para proteger tu negocio: stock, mobiliario, responsabilidad civil y más, con coberturas adaptadas a cada rubro y actividad.</p>
                <ul>
                  <li><i className="fa-solid fa-circle-check" />Incendio de locales y depósitos</li>
                  <li><i className="fa-solid fa-circle-check" />Cobertura de stock y maquinaria</li>
                  <li><i className="fa-solid fa-circle-check" />Responsabilidad civil empresarial</li>
                  <li><i className="fa-solid fa-circle-check" />Robo de mercadería y equipos</li>
                  <li><i className="fa-solid fa-circle-check" />ART y accidentes de empleados</li>
                </ul>
                <Link className="product-card-link" to="/contacto"><i className="fa-solid fa-arrow-right" />Asesorarme</Link>
              </article>
            </div>
          </section>

          <section className="cta scroll-anim" data-anim="slam-up">
            <div className="cta-image scroll-anim" data-anim="bounce-left" style={{ '--d': '90ms' } as React.CSSProperties}>
              <img
                src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80"
                alt="Asesor de AD SEGUROS"
              />
            </div>
            <div className="cta-copy scroll-anim" data-anim="bounce-right" style={{ '--d': '180ms' } as React.CSSProperties}>
              <span className="eyebrow"><i className="fa-solid fa-star" />¿No sabés qué producto te conviene?</span>
              <h2>Te asesoramos sin costo y sin compromiso</h2>
              <p>
                Analizamos tu situación particular y te recomendamos la cobertura que mejor se adapta
                a tus necesidades y presupuesto.
              </p>
              <p>
                Respondemos en menos de 24 horas hábiles con una propuesta clara y personalizada,
                sin letra chica ni sorpresas.
              </p>
              <Link className="btn" to="/contacto">
                <i className="fa-solid fa-headset" />Solicitar asesoramiento gratuito
              </Link>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
