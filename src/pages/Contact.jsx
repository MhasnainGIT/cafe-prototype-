import { useState } from 'react';
import { submitReservation } from '../services/stitchClient';

function Contact() {
  const [formData, setFormData] = useState({ name: '', contact: '', date: '', time: '', party_size: '', notes: '' });
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await submitReservation(formData);
      setStatus('success');
      setFormData({ name: '', contact: '', date: '', time: '', party_size: '', notes: '' });
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="section" style={{ paddingTop: '120px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="section-title">Reservations & Contact</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>
        <div>
          <h2 style={{ color: 'var(--color-cream)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Find Us</h2>
          <p style={{ color: 'var(--color-muted)' }}>123 Flynn Avenue<br/>Culinary District<br/>City, ST 12345</p>
          <br/>
          <h3 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }}>Hours</h3>
          <ul style={{ listStyle: 'none', padding: 0, color: 'var(--color-muted)', lineHeight: '2' }}>
            <li>Mon - Thu: 11am - 10pm</li>
            <li>Fri - Sat: 11am - 11pm</li>
            <li>Sunday: 10am - 9pm</li>
          </ul>
        </div>

        <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '4px' }}>
          <h2 style={{ color: 'var(--color-cream)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Book a Table</h2>
          {status === 'success' ? (
            <div style={{ color: 'var(--color-gold)', textAlign: 'center', padding: '2rem 0' }}>
              Reservation Request Sent! We will contact you shortly to confirm.
              <button className="btn" style={{ marginTop: '2rem' }} onClick={() => setStatus(null)}>Make Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input required type="text" placeholder="Name" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input required type="text" placeholder="Phone or Email" style={inputStyle} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input required type="date" style={{...inputStyle, flex: 1}} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <input required type="time" style={{...inputStyle, flex: 1}} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
              </div>
              <input required type="number" placeholder="Party Size" min="1" max="20" style={inputStyle} value={formData.party_size} onChange={e => setFormData({...formData, party_size: e.target.value})} />
              <textarea placeholder="Special Requests (optional)" style={{...inputStyle, height: '100px', resize: 'vertical'}} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Submitting...' : 'Request Reservation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: 'var(--color-bg)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--color-text)',
  padding: '1rem',
  fontFamily: 'var(--font-body)',
  width: '100%',
  boxSizing: 'border-box'
};

export default Contact;
