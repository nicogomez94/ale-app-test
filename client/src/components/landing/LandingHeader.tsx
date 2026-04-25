import { useState } from 'react';
import { Link } from 'react-router-dom';
import CotizacionModal from './CotizacionModal';

interface LandingHeaderProps {
  showSystemLink?: boolean;
}

export function LandingHeader({ showSystemLink = false }: LandingHeaderProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand scroll-anim" data-anim="slam-up" to="/">
            <span className="brand-mark">
              <img src="/assets/pasalert.png" alt="PAS Alert" />
            </span>
          </Link>
          <nav className="menu">
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '40ms' } as React.CSSProperties} to="/">
              <i className="fa-solid fa-house" />Inicio
            </Link>
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '90ms' } as React.CSSProperties} to="/quienes-somos">
              <i className="fa-solid fa-users" />Quiénes somos
            </Link>
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '140ms' } as React.CSSProperties} to="/seguros">
              <i className="fa-solid fa-car-side" />Seguros
            </Link>
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '190ms' } as React.CSSProperties} to="/gestoria-automotor">
              <i className="fa-solid fa-id-card" />Gestoría Automotor
            </Link>
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '240ms' } as React.CSSProperties} to="/asistencia-juridica">
              <i className="fa-solid fa-scale-balanced" />Asistencia Jurídica
            </Link>
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '290ms' } as React.CSSProperties} to="/productores">
              <i className="fa-solid fa-briefcase" />Productores
            </Link>
            <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '340ms' } as React.CSSProperties} to="/contacto">
              <i className="fa-solid fa-address-book" />Contacto
            </Link>
            {showSystemLink && (
              <Link className="scroll-anim nav-sistema" data-anim="flip-in" style={{ '--d': '390ms' } as React.CSSProperties} to="/app/login">
                <i className="fa-solid fa-arrows-to-circle" />Sistema de Gestión
              </Link>
            )}
          </nav>
          <div className="topbar-actions">
            <button className="btn-cotizar" onClick={() => setShowModal(true)}>
              <i className="fa-solid fa-file-invoice" /> Cotizá tu seguro
            </button>
          </div>
        </div>
      </header>
      {showModal && <CotizacionModal onClose={() => setShowModal(false)} />}
    </>
  );
}

