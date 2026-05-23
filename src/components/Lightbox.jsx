function Lightbox({ image, onClose }) {
  if (!image) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 14, 13, 0.95)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }} onClick={onClose}>
      <button style={{
        position: 'absolute',
        top: '20px', right: '20px',
        background: 'transparent',
        border: '1px solid var(--color-gold)',
        color: 'var(--color-gold)',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        fontSize: '1rem'
      }} onClick={onClose}>Close</button>
      <img src={image} alt="Gallery" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
    </div>
  );
}

export default Lightbox;
