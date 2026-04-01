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
            <span className="eyebrow"><i className="fa-solid fa-id-card" />Gestoría Automotor</span>
            <h1>Trámites automotor rápidos y sin vueltas</h1>
            <p>
              Gestionamos transferencias, denuncias de venta, informes de dominio y trámites registrales
              para que resuelvas todo con acompañamiento profesional.
            </p>
          </section>

          <div className="gestoria-section scroll-anim" data-anim="slam-up">
            <h2><i className="fa-solid fa-right-left" style={{ color: '#0baab2', marginRight: 8 }} />Transferencias</h2>
            <ul className="gestoria-list">
              <li><i className="fa-solid fa-circle-check" />Transferencia de dominio de vehículos</li>
              <li><i className="fa-solid fa-circle-check" />Alta de dominio (vehículos 0 km)</li>
              <li><i className="fa-solid fa-circle-check" />Baja de dominio</li>
              <li><i className="fa-solid fa-circle-check" />Verificación policial (previa a la transferencia)</li>
              <li><i className="fa-solid fa-circle-check" />Revisión técnica obligatoria</li>
            </ul>
          </div>

          <div className="gestoria-section scroll-anim" data-anim="slam-up">
            <h2><i className="fa-solid fa-file-circle-check" style={{ color: '#0baab2', marginRight: 8 }} />Informes y certificaciones</h2>
            <ul className="gestoria-list">
              <li><i className="fa-solid fa-circle-check" />Informe de dominio completo</li>
              <li><i className="fa-solid fa-circle-check" />Libre deuda de patentes y multas</li>
              <li><i className="fa-solid fa-circle-check" />Certificado de libre deuda de infracciones</li>
              <li><i className="fa-solid fa-circle-check" />Informe de antecedentes del vehículo</li>
              <li><i className="fa-solid fa-circle-check" />Certificación de no robo</li>
            </ul>
          </div>

          <div className="gestoria-section scroll-anim" data-anim="slam-up">
            <h2><i className="fa-solid fa-car-rear" style={{ color: '#0baab2', marginRight: 8 }} />Denuncia de venta</h2>
            <ul className="gestoria-list">
              <li><i className="fa-solid fa-circle-check" />Denuncia de venta ante el Registro Nacional del Automotor</li>
              <li><i className="fa-solid fa-circle-check" />Formularios y documentación requerida</li>
              <li><i className="fa-solid fa-circle-check" />Seguimiento hasta la aprobación del trámite</li>
              <li><i className="fa-solid fa-circle-check" />Asesoramiento sobre tiempos y costos</li>
            </ul>
          </div>

          <div className="gestoria-section scroll-anim" data-anim="slam-up">
            <h2><i className="fa-solid fa-file-invoice" style={{ color: '#0baab2', marginRight: 8 }} />Otros trámites</h2>
            <ul className="gestoria-list">
              <li><i className="fa-solid fa-circle-check" />Regularización de deudas de patentes</li>
              <li><i className="fa-solid fa-circle-check" />Duplicado de título del automotor</li>
              <li><i className="fa-solid fa-circle-check" />Cambio de radicación</li>
              <li><i className="fa-solid fa-circle-check" />Inscripción de prenda y cancelación</li>
              <li><i className="fa-solid fa-circle-check" />Gestión de chapa patente (pérdida o robo)</li>
            </ul>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48, marginBottom: 40 }} className="scroll-anim" data-anim="slam-up">
            <p style={{ fontSize: 15, color: '#4a6279', marginBottom: 18 }}>
              ¿Necesitás un trámite que no ves en la lista? Consultanos, seguro lo podemos gestionar.
            </p>
            <a
              className="btn"
              href="https://wa.me/5492994000000?text=Hola%2C+necesito+asesoramiento+sobre+gest%C3%B3ria+automotor."
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
