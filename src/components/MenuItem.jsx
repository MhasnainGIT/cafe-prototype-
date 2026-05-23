import { useCart } from '../context/CartContext';

function MenuItem({ item, onARClick }) {
  const { addToCart } = useCart();

  return (
    <div className="menu-card">
      <div className="menu-card-img-wrap">
        <img src={item.image_url} alt={item.name} className="menu-card-img" />
        <div className="menu-card-ar-btns">
          <button className="menu-card-3d-badge" onClick={() => onARClick(item, '3d')} title="View 3D model">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            3D
          </button>
          <button className="menu-card-ar-badge" onClick={() => onARClick(item, 'ar')} title="View in AR">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            AR
          </button>
        </div>
      </div>
      <div className="menu-card-body">
        <div className="menu-card-top">
          <div>
            <div className="menu-card-badges">
              <span className={`veg-badge ${item.is_veg ? 'veg' : 'non-veg'}`}><span className="veg-dot"></span></span>
              {item.is_bestseller && <span className="bestseller-tag">★ Bestseller</span>}
            </div>
            <h3 className="menu-card-name">{item.name}</h3>
            <p className="menu-card-desc">{item.description}</p>
            {item.calories && <p className="menu-card-cal">{item.calories} · {item.protein} protein</p>}
          </div>
          <div className="menu-card-right">
            <p className="menu-card-price">₹{item.price}</p>
            <button className="menu-card-add" onClick={() => addToCart(item)}>ADD +</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuItem;
