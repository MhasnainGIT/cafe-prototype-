import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllMenu } from '../services/stitchClient';
import { useCart } from '../context/CartContext';

function Home() {
  const [featuredItems, setFeaturedItems] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    getAllMenu().then((items) => {
      setFeaturedItems(items.filter((i) => i.is_bestseller).slice(0, 4));
    });
  }, []);

  return (
    <>
      <section className="hero-video-container">
        <video
          id="hero-video"
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop"
          data-src="/assets/flynn-cafe-hero.mp4"
        />
        <div className="hero-overlay">
          <h1 className="hero-title">Flynn Cafe</h1>
          <p className="hero-subtitle">Immersive Culinary Experiences</p>
          <div className="hero-actions">
            <Link to="/contact" className="btn btn-primary">
              Reserve
            </Link>
            <Link to="/menu" className="btn">
              Menu
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Chef&apos;s Picks</h2>
        <div className="featured-grid">
          {featuredItems.map((item) => (
            <article key={item.id} className="featured-card">
              <img src={item.image_url} alt={item.name} className="featured-card-img" />
              <div className="featured-card-body">
                <div className="menu-card-badges">
                  <span className={`veg-badge ${item.is_veg ? 'veg' : 'non-veg'}`}>
                    <span className="veg-dot" />
                  </span>
                  <span className="bestseller-tag">★ Bestseller</span>
                </div>
                <h3 className="featured-card-name">{item.name}</h3>
                <p className="featured-card-desc">{item.description}</p>
                <div className="featured-card-foot">
                  <span className="menu-card-price">₹{item.price}</span>
                  <button type="button" className="swiggy-add-btn" onClick={() => addToCart(item)}>
                    ADD
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default Home;
