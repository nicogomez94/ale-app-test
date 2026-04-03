import { Link } from 'react-router-dom';

export function LandingFooter() {
  return (
    <footer className="site-footer scroll-anim" data-anim="slam-up">
      <div className="footer-top">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <img src="/assets/ad.svg" alt="AD Seguros" />
            </span>
          </Link>
          <p>Productora de seguros con asesoramiento personalizado para autos, hogar y comercio.</p>
          <div className="footer-social">
            <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram" /></a>
            <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook-f" /></a>
            <a href="#" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in" /></a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Servicios</h4>
          <Link to="/seguros">Seguro automotor</Link>
          <Link to="/seguros">Seguro de hogar</Link>
          <Link to="/seguros">AP y vida</Link>
          <Link to="/seguros">Cobertura comercial</Link>
        </div>
        <div className="footer-col">
          <h4>Empresa</h4>
          <Link to="/quienes-somos">Quiénes somos</Link>
          <Link to="/asistencia-juridica">Asistencia Jurídica</Link>
          <Link to="/preguntas-frecuentes">Preguntas frecuentes</Link>
        </div>
        <div className="footer-col">
          <h4>Contacto</h4>
          <a href="tel:+541155551234"><i className="fa-solid fa-phone" />+54 11 5555 1234</a>
          <a href="mailto:info@adseguros.com.ar"><i className="fa-solid fa-envelope" />info@adseguros.com.ar</a>
          <a href="https://wa.me/541155551234" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-whatsapp" />WhatsApp
          </a>
          <a href="https://maps.google.com/?q=Ciudad+Autonoma+de+Buenos+Aires" target="_blank" rel="noopener noreferrer">
            <i className="fa-solid fa-location-dot" />Ciudad Autónoma de Buenos Aires
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>&copy; 2026 AD Seguros.</span>
        <div className="footer-legal">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </div>
      </div>
    </footer>
  );
}
