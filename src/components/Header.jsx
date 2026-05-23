import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

function Header() {
  const { cart } = useCart();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.2rem 5%',
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 200,
      background: 'rgba(13,13,13,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)'
    }}>
      <div className="logo">
        <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-gold)' }}>Flynn Cafe</Link>
      </div>
      <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link to="/menu" style={{ color: 'var(--color-cream)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Menu</Link>
        <Link to="/about" style={{ color: 'var(--color-cream)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Story</Link>
        <Link to="/gallery" style={{ color: 'var(--color-cream)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Gallery</Link>
        <Link to="/contact" style={{ color: 'var(--color-cream)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Contact</Link>
        
        <Link to="/cart" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <ShoppingCart color="var(--color-gold)" size={24} />
          {itemCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-10px',
              background: 'var(--color-cream)',
              color: 'var(--color-bg)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {itemCount}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}

export default Header;
