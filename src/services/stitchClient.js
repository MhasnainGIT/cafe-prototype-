const STITCH_BASE = import.meta.env.VITE_STITCH_API_BASE;

const MOCK_MENU = [
  {
    id: "sushi-platter", name: "Sushi Platter", category: "Starters",
    description: "Hand-crafted sushi rolls, nigiri and sashimi served with pickled ginger, wasabi and soy sauce.",
    price: 620, image_url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: false, is_bestseller: true,
    calories: "350 kcal", protein: "18g", carbs: "52g", fat: "8g"
  },
  {
    id: "grand-royale-burger", name: "Grand Royale Burger", category: "Starters",
    description: "Signature double-stacked burger with aged cheddar and truffle aioli.",
    price: 520, image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: false, is_bestseller: true,
    calories: "280 kcal", protein: "22g", carbs: "34g", fat: "14g"
  },
  {
    id: "platter", name: "Chef's Sharing Platter", category: "Starters",
    description: "Chef's curated sharing platter with assorted bites for the table.",
    price: 380, image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: false, is_bestseller: false,
    calories: "450 kcal", protein: "28g", carbs: "40g", fat: "20g"
  },
  {
    id: "truffle-fries", name: "Truffle Parmesan Fries", category: "Starters",
    description: "Hand-cut fries tossed with truffle oil, parmesan and fresh herbs.",
    price: 280, image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: true,
    calories: "320 kcal", protein: "6g", carbs: "42g", fat: "16g"
  },
  {
    id: "imperial-truffle-pizza", name: "Imperial Truffle Pizza", category: "Mains",
    description: "Wood-fired pizza with black truffle, burrata and wild rocket.",
    price: 680, image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: true,
    calories: "520 kcal", protein: "18g", carbs: "58g", fat: "24g"
  },
  {
    id: "crispy-royale-platter", name: "Crispy Royale Platter", category: "Mains",
    description: "Golden fried selection with house dipping sauces and coleslaw.",
    price: 460, image_url: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: false, is_bestseller: false,
    calories: "580 kcal", protein: "32g", carbs: "48g", fat: "28g"
  },
  {
    id: "webhaze-classic-pizza", name: "Webhaze Classic Pizza", category: "Mains",
    description: "House pizza with signature Webhaze sauce and fresh mozzarella.",
    price: 420, image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: false,
    calories: "480 kcal", protein: "16g", carbs: "54g", fat: "22g"
  },
  {
    id: "grilled-salmon", name: "Herb Grilled Salmon", category: "Mains",
    description: "Atlantic salmon fillet with lemon butter, asparagus and mashed potato.",
    price: 780, image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: false, is_bestseller: true,
    calories: "420 kcal", protein: "38g", carbs: "22g", fat: "18g"
  },
  {
    id: "webhaze-espresso", name: "Webhaze Signature Espresso", category: "Drinks",
    description: "Double-shot espresso with house-roasted arabica beans.",
    price: 180, image_url: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: true,
    calories: "5 kcal", protein: "0g", carbs: "1g", fat: "0g"
  },
  {
    id: "golden-latte", name: "Golden Turmeric Latte", category: "Drinks",
    description: "Creamy oat milk latte with turmeric, cinnamon and vanilla.",
    price: 220, image_url: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: false,
    calories: "120 kcal", protein: "4g", carbs: "18g", fat: "4g"
  },
  {
    id: "berry-smoothie", name: "Mixed Berry Smoothie", category: "Drinks",
    description: "Fresh blueberries, strawberries and açaí blended with yogurt.",
    price: 260, image_url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: false,
    calories: "180 kcal", protein: "6g", carbs: "36g", fat: "2g"
  },
  {
    id: "tiramisu", name: "Classic Tiramisu", category: "Desserts",
    description: "Layers of espresso-soaked ladyfingers with mascarpone cream.",
    price: 340, image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: true,
    calories: "350 kcal", protein: "6g", carbs: "40g", fat: "18g"
  },
  {
    id: "chocolate-fondant", name: "Chocolate Fondant", category: "Desserts",
    description: "Warm chocolate lava cake with vanilla bean ice cream.",
    price: 380, image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop",
    ar_marker_ref: "/pattern-webhaze_logo_6.patt", ar_model_url: "/models/Sushi_Platter.glb",
    is_available: true, is_veg: true, is_bestseller: false,
    calories: "420 kcal", protein: "8g", carbs: "52g", fat: "22g"
  }
];

export async function callStitch(functionName, args = {}) {
  if (STITCH_BASE && !STITCH_BASE.includes("YOUR_APP_ID")) {
    try {
      const res = await fetch(STITCH_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: functionName, arguments: [args] })
      });
      if (!res.ok) throw new Error(`Stitch error: ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`Stitch fallback to mock:`, e);
    }
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      if (functionName === 'getMenuByCategory') {
        if (args && args.category) resolve(MOCK_MENU.filter(m => m.category === args.category));
        else resolve(MOCK_MENU);
      } else if (functionName === 'submitOrder' || functionName === 'submitReservation') {
        resolve({ insertedId: 'mock-id-' + Date.now() });
      } else if (functionName === 'getGallery') resolve([]);
      else resolve({});
    }, 300);
  });
}

export const getMenuByCategory = (cat) => callStitch("getMenuByCategory", { category: cat });
export const getAllMenu = () => callStitch("getMenuByCategory", {});
export const submitOrder = (payload) => callStitch("submitOrder", payload);
export const submitReservation = (payload) => callStitch("submitReservation", payload);
export const getGallery = () => callStitch("getGallery");
