import { useState } from 'react';
import { submitReservation } from '../services/stitchClient';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    date: '',
    time: '',
    party_size: '',
    notes: '',
  });
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await submitReservation(formData);
      setStatus('success');
      setFormData({ name: '', contact: '', date: '', time: '', party_size: '', notes: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">Contact</h1>

      <div className="contact-grid">
        <div className="contact-info">
          <h2>Find Us</h2>
          <p>
            123 Flynn Avenue
            <br />
            Culinary District
            <br />
            City, ST 12345
          </p>
          <h3 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', margin: '1.25rem 0 0.35rem' }}>
            Hours
          </h3>
          <ul className="contact-hours">
            <li>Mon – Thu: 11am – 10pm</li>
            <li>Fri – Sat: 11am – 11pm</li>
            <li>Sunday: 10am – 9pm</li>
          </ul>
        </div>

        <div className="form-panel">
          <h2 className="form-heading">Book a Table</h2>
          {status === 'success' ? (
            <div style={{ color: 'var(--color-gold)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.9rem' }}>
              Request sent. We&apos;ll confirm shortly.
              <br />
              <button type="button" className="btn" style={{ marginTop: '1.25rem' }} onClick={() => setStatus(null)}>
                Book Again
              </button>
            </div>
          ) : (
            <form className="form-stack" onSubmit={handleSubmit}>
              <input
                required
                type="text"
                className="form-input"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                required
                type="text"
                className="form-input"
                placeholder="Phone or email"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
              <div className="form-row-2">
                <input
                  required
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
                <input
                  required
                  type="time"
                  className="form-input"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <input
                required
                type="number"
                className="form-input"
                placeholder="Party size"
                min="1"
                max="20"
                value={formData.party_size}
                onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
              />
              <textarea
                className="form-input"
                placeholder="Notes (optional)"
                rows={3}
                style={{ resize: 'vertical' }}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Sending…' : 'Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Contact;
