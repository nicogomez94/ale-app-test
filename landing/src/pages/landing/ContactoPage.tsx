import { useState } from 'react';
import { useScrollAnim } from '../../hooks/useScrollAnim';
import { LandingHeader } from '../../components/landing/LandingHeader';
import { LandingFooter } from '../../components/landing/LandingFooter';
import { api } from '../../api';
import '../../styles/landing.css';

interface ContactForm {
  nombre: string;
  email: string;
  telefono: string;
  asunto: string;
  mensaje: string;
}

export function ContactoPage() {
  useScrollAnim();
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState<ContactForm>({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setSubmitError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.landing.submitContacto({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        asunto: form.asunto,
        mensaje: form.mensaje,
      });
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo enviar la consulta.');
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <span className="eyebrow"><i className="fa-solid fa-phone-volume" />Contacto</span>
            <h1>Estamos para ayudarte</h1>
            <p>
              Comunicate con nuestro equipo por el canal que prefieras. Respondemos todas las consultas
              en menos de 24 horas hábiles, sin compromisos.
            </p>
          </section>

          <section className="contact-section">
            <div className="contact-grid scroll-anim" data-anim="slam-up">
              <div className="contact-form-card">
                {sent ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '48px', color: '#0daeb2', marginBottom: '16px', display: 'block' }} />
                    <h3 style={{ marginBottom: '10px' }}>¡Mensaje enviado!</h3>
                    <p style={{ color: '#637082', fontSize: '14px' }}>
                      Recibimos tu consulta. Un asesor te va a contactar en menos de 24 horas hábiles.
                    </p>
                    <button
                      className="btn"
                      style={{ marginTop: '20px' }}
                      onClick={() => { setSent(false); setForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' }); }}
                    >
                      Enviar otra consulta
                    </button>
                  </div>
                ) : (
                  <>
                    <h3>Envianos tu consulta</h3>
                    <p>Completá el formulario y te respondemos a la brevedad.</p>
                    <form onSubmit={handleSubmit}>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="nombre">Nombre completo</label>
                          <input id="nombre" name="nombre" className="form-input" type="text" placeholder="Juan Pérez" value={form.nombre} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor="telefono">Teléfono</label>
                          <input id="telefono" name="telefono" className="form-input" type="tel" placeholder="+54 11 1234 5678" value={form.telefono} onChange={handleChange} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" className="form-input" type="email" placeholder="juan@email.com" value={form.email} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="asunto">Asunto</label>
                        <select id="asunto" name="asunto" className="form-input" value={form.asunto} onChange={handleChange} required>
                          <option value="">Seleccioná un asunto...</option>
                          <option value="cotizacion">Cotización de seguro</option>
                          <option value="renovacion">Renovación de póliza</option>
                          <option value="siniestro">Consulta sobre siniestro</option>
                          <option value="general">Consulta general</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="mensaje">Mensaje</label>
                        <textarea id="mensaje" name="mensaje" className="form-input" placeholder="Contanos en qué podemos ayudarte..." value={form.mensaje} onChange={handleChange} required />
                      </div>
                      <button className="btn" type="submit" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center', opacity: isSubmitting ? 0.8 : 1 }}>
                        <i className="fa-solid fa-paper-plane" />{isSubmitting ? 'Enviando...' : 'Enviar consulta'}
                      </button>
                      {submitError && (
                        <p style={{ color: '#c94b4b', fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                          {submitError}
                        </p>
                      )}
                    </form>
                  </>
                )}
              </div>

              <div>
                <div className="contact-info-list">
                  <div className="contact-info-item">
                    <div className="contact-info-icon"><i className="fa-solid fa-phone" /></div>
                    <div className="contact-info-text">
                      <h4>Teléfono</h4>
                      <a href="tel:+541155551234">+54 11 5555 1234</a>
                      <p>Lunes a Viernes de 9 a 18 hs</p>
                    </div>
                  </div>
                  <div className="contact-info-item">
                    <div className="contact-info-icon"><i className="fa-brands fa-whatsapp" /></div>
                    <div className="contact-info-text">
                      <h4>WhatsApp</h4>
                      <a href="https://wa.me/541155551234" target="_blank" rel="noopener noreferrer">+54 11 5555 1234</a>
                      <p>Respuesta en menos de 2 horas</p>
                    </div>
                  </div>
                  <div className="contact-info-item">
                    <div className="contact-info-icon"><i className="fa-solid fa-envelope" /></div>
                    <div className="contact-info-text">
                      <h4>Email</h4>
                      <a href="mailto:info@adseguros.com.ar">info@adseguros.com.ar</a>
                      <p>Respondemos en menos de 24 hs hábiles</p>
                    </div>
                  </div>
                  <div className="contact-info-item">
                    <div className="contact-info-icon"><i className="fa-solid fa-location-dot" /></div>
                    <div className="contact-info-text">
                      <h4>Dirección</h4>
                      <a href="#">Buenos Aires, Argentina</a>
                      <p>Ciudad Autónoma de Buenos Aires</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="horario-section scroll-anim" data-anim="slam-up">
            <h2><i className="fa-solid fa-clock" style={{ color: '#0baab2', marginRight: 8 }} />Horario de atención</h2>
            <div className="horario-grid">
              <div className="horario-card">
                <i className="fa-solid fa-briefcase" />
                <div className="horario-day">Lunes a Viernes</div>
                <div className="horario-time">9:00 — 18:00 hs</div>
              </div>
              <div className="horario-card">
                <i className="fa-solid fa-umbrella-beach" />
                <div className="horario-day">Sábados</div>
                <div className="horario-time">9:00 — 13:00 hs</div>
              </div>
              <div className="horario-card closed">
                <i className="fa-solid fa-moon" />
                <div className="horario-day">Domingos</div>
                <div className="horario-time">Cerrado</div>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
