import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllMenu } from '../services/stitchClient';
import { useCart } from '../context/CartContext';

function Home() {
  const [featuredItems, setFeaturedItems] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    getAllMenu().then(items => {
      setFeaturedItems(items.filter(i => i.is_bestseller).slice(0, 4));
    });
  }, []);

  return (
    <>
      <section className="hero-video-container">
        <video
          id="hero-video"
          className="hero-video"
          autoPlay muted loop playsInline
          poster="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop"
          data-src="/assets/flynn-cafe-hero.mp4"
        />
        <div className="hero-overlay">
          <h1 className="hero-title">Flynn Cafe</h1>
          <p className="hero-subtitle">Immersive Culinary Experiences</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/contact" className="btn btn-primary">Reserve a Table</Link>
            <Link to="/menu" className="btn">Explore Menu</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Chef's Picks</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {featuredItems.map(item => (
            <div key={item.id} style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.3s', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className={`veg-badge ${item.is_veg ? 'veg' : 'non-veg'}`}><span className="veg-dot"></span></span>
                  <span className="bestseller-tag">★ Bestseller</span>
                </div>
                <h3 style={{ margin: '0 0 4px', color: 'var(--color-cream)', fontSize: '1.1rem' }}>{item.name}</h3>
                <p style={{ margin: '0 0 12px', color: 'var(--color-muted)', fontSize: '0.82rem' }}>{item.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>₹{item.price}</span>
                  <button className="swiggy-add-btn" onClick={() => addToCart(item)}>ADD</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default Home;
