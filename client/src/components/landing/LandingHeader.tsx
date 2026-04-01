import { Link } from 'react-router-dom';

export function LandingHeader() {
  return (
    <header className="topbar">
      <Link className="brand scroll-anim" data-anim="slam-up" to="/">
        <span className="brand-mark">
          <i className="fa-solid fa-shield-halved" />
        </span>
        <span className="brand-name">AD SEGUROS</span>
      </Link>
      <nav className="menu">
        <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '40ms' } as React.CSSProperties} to="/">
          <i className="fa-solid fa-house" />Inicio
        </Link>
        <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '90ms' } as React.CSSProperties} to="/quienes-somos">
          <i className="fa-solid fa-users" />Quienes somos
        </Link>
        <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '140ms' } as React.CSSProperties} to="/seguros">
          <i className="fa-solid fa-car-side" />Seguros
        </Link>
        <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '190ms' } as React.CSSProperties} to="/asistencia-juridica">
          <i className="fa-solid fa-scale-balanced" />Asistencia Juridica
        </Link>
        <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '240ms' } as React.CSSProperties} to="/gestoria-automotor">
          <i className="fa-solid fa-id-card" />Gestoria Automotor
        </Link>
        <Link className="scroll-anim" data-anim="flip-in" style={{ '--d': '290ms' } as React.CSSProperties} to="/contacto">
          <i className="fa-solid fa-phone-volume" />Contacto
        </Link>
      </nav>
      <div className="topbar-actions">
        <Link className="btn btn-small" to="/app/login">
          <i className="fa-solid fa-arrow-right-to-bracket" />Ir al sistema
        </Link>
      </div>
    </header>
  );
}
