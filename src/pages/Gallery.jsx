import { useState } from 'react';
import Lightbox from '../components/Lightbox';

const GALLERY_IMAGES = [
  { id: '1', image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop', caption: 'Flynn Cafe Interior' },
  { id: '2', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop', caption: 'Grand Royale Burger' },
  { id: '3', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', caption: 'Imperial Truffle Pizza' },
  { id: '4', image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop', caption: 'Fine Dining' },
  { id: '5', image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop', caption: 'Herb Grilled Salmon' },
  { id: '6', image_url: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&h=400&fit=crop', caption: 'Signature Espresso' },
  { id: '7', image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop', caption: 'Classic Tiramisu' },
  { id: '8', image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop', caption: 'Cafe Ambiance' },
];

function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="section" style={{ paddingTop: '120px' }}>
      <h1 className="section-title">Gallery</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
        {GALLERY_IMAGES.map(item => (
          <div key={item.id} style={{ cursor: 'pointer', overflow: 'hidden', height: '250px', borderRadius: '10px' }}
            onClick={() => setSelectedImage(item.image_url)}
          >
            <img src={item.image_url} alt={item.caption}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
        ))}
      </div>
      <Lightbox image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}

export default Gallery;
