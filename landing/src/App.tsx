import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/landing/LandingPage';
import { NosotrosPage } from './pages/landing/NosotrosPage';
import { ProductosPage } from './pages/landing/ProductosPage';
import { CoberturasPage } from './pages/landing/CoberturasPage';
import { SiniestrosPage } from './pages/landing/SiniestrosPage';
import { GestoriaAutomotorPage } from './pages/landing/GestoriaAutomotorPage';
import { ProductoresPage } from './pages/landing/ProductoresPage';
import { ContactoPage } from './pages/landing/ContactoPage';
import { PreguntasFrecuentesPage } from './pages/landing/PreguntasFrecuentesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/quienes-somos" element={<NosotrosPage />} />
      <Route path="/seguros" element={<ProductosPage />} />
      <Route path="/coberturas" element={<CoberturasPage />} />
      <Route path="/asistencia-juridica" element={<SiniestrosPage />} />
      <Route path="/gestoria-automotor" element={<GestoriaAutomotorPage />} />
      <Route path="/productores" element={<ProductoresPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
      <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
