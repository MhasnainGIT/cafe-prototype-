import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'Story' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
];

function Header() {
  const { cart } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  return (
    <header className="site-header">
      <Link to="/" className="site-logo" onClick={() => setOpen(false)}>
        Flynn Cafe
      </Link>

      <div className="site-header-actions">
        <Link to="/cart" className="site-cart" aria-label="Cart" onClick={() => setOpen(false)}>
          <ShoppingCart size={20} strokeWidth={1.75} />
          {itemCount > 0 && <span className="site-cart-count">{itemCount}</span>}
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
        </button>
      </div>

      <div className={`nav-backdrop ${open ? 'is-visible' : ''}`} onClick={() => setOpen(false)} aria-hidden />

      <nav className={`site-nav ${open ? 'is-open' : ''}`} aria-label="Main">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`site-nav-link ${location.pathname === to ? 'is-active' : ''}`}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export default Header;
