import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CotizacionModal from './CotizacionModal';

interface LandingHeaderProps {
  showSystemLink?: boolean;
}

export function LandingHeader({ showSystemLink = false }: LandingHeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand scroll-anim" data-anim="slam-up" to="/">
            <span className="brand-mark">
              <img src="/assets/ad.svg" alt="AD Seguros" />
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="menu">
            <Link to="/quienes-somos">
              <i className="fa-solid fa-users" />Nosotros
            </Link>
            <Link to="/seguros">
              <i className="fa-solid fa-car-side" />Seguros
            </Link>
            <Link to="/gestoria-automotor">
              <i className="fa-solid fa-id-card" />Vehículos
            </Link>
            <Link to="/asistencia-juridica">
              <i className="fa-solid fa-scale-balanced" />Jurídica
            </Link>
            <Link to="/productores">
              <i className="fa-solid fa-briefcase" />Productores
            </Link>
            <Link to="/contacto">
              <i className="fa-solid fa-address-book" />Contacto
            </Link>
            {showSystemLink && (
              <Link className="nav-sistema" to="/app/login">
                <i className="fa-solid fa-arrows-to-circle" />PAS Alert
              </Link>
            )}
          </nav>

          <div className="topbar-actions">
            <button className="btn-cotizar" onClick={() => setShowModal(true)}>
              <i className="fa-solid fa-file-invoice" /> Cotizá tu seguro
            </button>
            {/* Hamburger button — mobile only */}
            <button
              className={`hamburger-btn${menuOpen ? ' is-open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menú"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />}
        <nav className={`mobile-menu${menuOpen ? ' is-open' : ''}`}>
          <Link to="/quienes-somos"><i className="fa-solid fa-users" />Nosotros</Link>
          <Link to="/seguros"><i className="fa-solid fa-car-side" />Seguros</Link>
          <Link to="/gestoria-automotor"><i className="fa-solid fa-id-card" />Vehículos</Link>
          <Link to="/asistencia-juridica"><i className="fa-solid fa-scale-balanced" />Jurídica</Link>
          <Link to="/productores"><i className="fa-solid fa-briefcase" />Productores</Link>
          <Link to="/contacto"><i className="fa-solid fa-address-book" />Contacto</Link>
          {showSystemLink && (
            <Link className="nav-sistema" to="/app/login">
              <i className="fa-solid fa-arrows-to-circle" />PAS Alert
            </Link>
          )}
          <button className="btn-cotizar mobile-cotizar" onClick={() => { setMenuOpen(false); setShowModal(true); }}>
            <i className="fa-solid fa-file-invoice" /> Cotizá tu seguro
          </button>
        </nav>
      </header>
      {showModal && <CotizacionModal onClose={() => setShowModal(false)} />}
    </>
  );
}

