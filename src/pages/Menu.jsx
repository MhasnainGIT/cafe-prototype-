import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { getAllMenu } from '../services/stitchClient';
import MenuItem from '../components/MenuItem';
import ARScanner from '../components/ARScanner';

const CATEGORIES = ['Starters', 'Mains', 'Drinks', 'Desserts'];

function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vegFilter, setVegFilter] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [arItem, setArItem] = useState(null);
  const [arMode, setArMode] = useState('3d');
  const sectionRefs = useRef({});

  useEffect(() => {
    getAllMenu().then(data => { setItems(data); setLoading(false); });
  }, []);

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (vegFilter === true && !i.is_veg) return false;
    if (vegFilter === false && i.is_veg) return false;
    return true;
  });

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: filtered.filter(i => i.category === cat)
  })).filter(g => g.items.length > 0);

  const scrollTo = (cat) => {
    setActiveTab(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="menu-page">
      {/* Header area */}
      <div className="menu-header-area">
        <h1 className="menu-page-title">Menu</h1>
        <p className="menu-page-sub">Tap 3D or AR on any dish</p>
        <div className="menu-delivery-badge">
          <span className="delivery-dot"></span>
          Dine-in · Estimated wait: <strong>15-25 min</strong>
        </div>
      </div>

      {/* Search */}
      <div className="menu-search-wrap">
        <Search size={18} className="menu-search-icon" />
        <input
          type="text"
          placeholder="Search for dishes..."
          className="menu-search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="menu-filters">
        <button className={`filter-chip ${vegFilter === null ? 'active' : ''}`} onClick={() => setVegFilter(null)}>
          <SlidersHorizontal size={14} /> All
        </button>
        <button className={`filter-chip veg-chip ${vegFilter === true ? 'active' : ''}`} onClick={() => setVegFilter(vegFilter === true ? null : true)}>
          <span className="veg-badge veg"><span className="veg-dot"></span></span> Veg
        </button>
        <button className={`filter-chip nonveg-chip ${vegFilter === false ? 'active' : ''}`} onClick={() => setVegFilter(vegFilter === false ? null : false)}>
          <span className="veg-badge non-veg"><span className="veg-dot"></span></span> Non Veg
        </button>
      </div>

      {/* Category tabs */}
      <div className="menu-cat-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-tab ${activeTab === cat ? 'active' : ''}`}
            onClick={() => scrollTo(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu sections */}
      {loading ? (
        <div className="menu-loading">Loading menu...</div>
      ) : grouped.length === 0 ? (
        <div className="menu-loading">No dishes found.</div>
      ) : (
        <div className="menu-sections">
          {grouped.map(group => (
            <div
              key={group.category}
              className="menu-section"
              ref={el => sectionRefs.current[group.category] = el}
            >
              <h2 className="menu-section-title">
                {group.category} ({group.items.length})
              </h2>
              <div className="menu-section-list">
                {group.items.map(item => (
                  <MenuItem key={item.id} item={item} onARClick={(item, mode) => { setArItem(item); setArMode(mode); }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {arItem && <ARScanner item={arItem} mode={arMode} onClose={() => setArItem(null)} />}
    </div>
  );
}

export default Menu;
