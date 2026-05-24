# cafe-prototype-

Webhaze Cafe web prototype with menu, cart, and tap-to-place AR for dishes.

## Features

- React + Vite menu and ordering UI
- **AR**: tap **AR** on a dish → full-screen camera → tap a table or surface to place the 3D model
- Pinch to resize, drag to rotate, auto-rotate when idle

## Run locally

```bash
npm install
npm run dev
```

Open the HTTPS URL shown in the terminal (required for camera / WebXR on phones).

## AR page

`/ar-view.html?model=/models/Sushi_Platter.glb`

## Stack

- React 18, Vite, React Router
- Three.js (tap-to-place AR)
- GLB models with Draco compression
