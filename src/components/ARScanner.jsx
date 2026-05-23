const DEFAULT_MODEL = '/models/Sushi_Platter.glb';

const SKETCHFAB_ITEMS = {
  'chocolate-fondant': 'https://sketchfab.com/models/7a424b8d9e3b476db72ade458aebbc42/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0',
};

function ARScanner({ item, mode, onClose }) {
  if (!item) return null;

  if (mode === 'ar') {
    const model = item.ar_model_url || DEFAULT_MODEL;
    const arUrl = `${window.location.origin}/ar-view.html?model=${encodeURIComponent(model)}`;
    window.open(arUrl, '_blank');
    onClose();
    return null;
  }

  const sketchfabUrl = SKETCHFAB_ITEMS[item.id];
  const modelSrc = item.ar_model_url || DEFAULT_MODEL;

  return (
    <div className="mv-overlay" onClick={onClose}>
      <div className="mv-modal" onClick={e => e.stopPropagation()}>
        <button className="mv-close" onClick={onClose}>✕</button>
        <div className="mv-header">
          <span className={`veg-badge ${item.is_veg ? 'veg' : 'non-veg'}`}><span className="veg-dot"></span></span>
          <h2 className="mv-title">{item.name}</h2>
          <p className="mv-price">₹{item.price}</p>
        </div>

        {sketchfabUrl ? (
          <iframe
            title={item.name}
            src={sketchfabUrl}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            style={{ width: '100%', height: '340px', border: 'none', background: '#111' }}
          />
        ) : (
          <model-viewer
            src={modelSrc}
            alt={item.name}
            auto-rotate
            camera-controls
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: '340px', background: 'transparent' }}
          ></model-viewer>
        )}

        <p className="mv-desc">{item.description}</p>
        {item.calories && (
          <div className="mv-nutrition">
            <span>{item.calories}</span>
            <span>Protein: {item.protein}</span>
            <span>Carbs: {item.carbs}</span>
            <span>Fat: {item.fat}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ARScanner;
