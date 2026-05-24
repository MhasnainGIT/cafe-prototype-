// generate-burger.js — creates a burger GLB made of stacked cylinders
// Run: node generate-burger.js
const fs = require('fs');
const path = require('path');

// Build a flat-topped cylinder (disc) mesh
// Returns { positions, indices, normals, color }
function makeCylinder(radiusTop, radiusBottom, height, yOffset, segments = 24) {
  const positions = [];
  const normals = [];
  const indices = [];

  const halfH = height / 2;
  const topY = yOffset + halfH;
  const botY = yOffset - halfH;

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    // top ring
    positions.push(radiusTop * cos, topY, radiusTop * sin);
    normals.push(cos, 0, sin);
    // bottom ring
    positions.push(radiusBottom * cos, botY, radiusBottom * sin);
    normals.push(cos, 0, sin);
  }

  // Side faces
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  // Top cap
  const topCenterIdx = positions.length / 3;
  positions.push(0, topY, 0); normals.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    positions.push(radiusTop * Math.cos(theta), topY, radiusTop * Math.sin(theta));
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 2 + i);
  }

  // Bottom cap
  const botCenterIdx = positions.length / 3;
  positions.push(0, botY, 0); normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    positions.push(radiusBottom * Math.cos(theta), botY, radiusBottom * Math.sin(theta));
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCenterIdx, botCenterIdx + 2 + i, botCenterIdx + 1 + i);
  }

  return { positions, normals, indices };
}

// Build a dome (top bun) using a hemisphere
function makeDome(radius, yOffset, segments = 24, rings = 12) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * (Math.PI / 2); // 0 to PI/2
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      positions.push(x, yOffset + y, z);
      normals.push(x / radius, y / radius, z / radius);
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { positions, normals, indices };
}

// Encode float32 array to buffer
function floatBuf(arr) {
  const b = Buffer.allocUnsafe(arr.length * 4);
  arr.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
}

// Encode uint16 array to buffer
function uint16Buf(arr) {
  const b = Buffer.allocUnsafe(arr.length * 2);
  arr.forEach((v, i) => b.writeUInt16LE(v, i * 2));
  return b;
}

function pad4(buf) {
  const rem = buf.length % 4;
  if (rem === 0) return buf;
  return Buffer.concat([buf, Buffer.alloc(4 - rem, 0x20)]);
}

// Burger layers: [radiusTop, radiusBottom, height, yOffset, r, g, b]
const layers = [
  // bottom bun
  { rt: 0.55, rb: 0.55, h: 0.18, y: 0.09,  r: 0.78, g: 0.52, b: 0.04 },
  // patty
  { rt: 0.50, rb: 0.50, h: 0.14, y: 0.27,  r: 0.36, g: 0.18, b: 0.02 },
  // cheese
  { rt: 0.58, rb: 0.58, h: 0.05, y: 0.375, r: 0.96, g: 0.77, b: 0.10 },
  // lettuce
  { rt: 0.60, rb: 0.60, h: 0.05, y: 0.43,  r: 0.30, g: 0.68, b: 0.20 },
  // tomato
  { rt: 0.52, rb: 0.52, h: 0.06, y: 0.49,  r: 0.90, g: 0.24, b: 0.12 },
];
// top bun dome
const topBun = { radius: 0.54, y: 0.55, r: 0.78, g: 0.52, b: 0.04 };

const meshes = [];
layers.forEach(l => {
  const m = makeCylinder(l.rt, l.rb, l.h, l.y);
  meshes.push({ ...m, color: [l.r, l.g, l.b] });
});
const dome = makeDome(topBun.radius, topBun.y);
meshes.push({ ...dome, color: [topBun.r, topBun.g, topBun.b] });

// Build GLB binary
const bufferViews = [];
const accessors = [];
const gltfMeshes = [];
let binChunks = [];
let byteOffset = 0;

meshes.forEach((mesh, mi) => {
  const posBuf = floatBuf(mesh.positions);
  const normBuf = floatBuf(mesh.normals);
  const idxBuf = uint16Buf(mesh.indices);

  // Compute min/max for positions
  const px = [], py = [], pz = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    px.push(mesh.positions[i]); py.push(mesh.positions[i+1]); pz.push(mesh.positions[i+2]);
  }
  const posMin = [Math.min(...px), Math.min(...py), Math.min(...pz)];
  const posMax = [Math.max(...px), Math.max(...py), Math.max(...pz)];

  // indices bufferView
  const idxBvIdx = bufferViews.length;
  bufferViews.push({ byteOffset, byteLength: idxBuf.length, target: 34963 });
  binChunks.push(idxBuf); byteOffset += idxBuf.length;

  // positions bufferView
  const posBvIdx = bufferViews.length;
  bufferViews.push({ byteOffset, byteLength: posBuf.length, byteStride: 12, target: 34962 });
  binChunks.push(posBuf); byteOffset += posBuf.length;

  // normals bufferView
  const normBvIdx = bufferViews.length;
  bufferViews.push({ byteOffset, byteLength: normBuf.length, byteStride: 12, target: 34962 });
  binChunks.push(normBuf); byteOffset += normBuf.length;

  const idxAccIdx = accessors.length;
  accessors.push({ bufferView: idxBvIdx, componentType: 5123, count: mesh.indices.length, type: 'SCALAR' });

  const posAccIdx = accessors.length;
  accessors.push({ bufferView: posBvIdx, componentType: 5126, count: mesh.positions.length / 3, type: 'VEC3', min: posMin, max: posMax });

  const normAccIdx = accessors.length;
  accessors.push({ bufferView: normBvIdx, componentType: 5126, count: mesh.normals.length / 3, type: 'VEC3' });

  const matIdx = mi;
  gltfMeshes.push({
    primitives: [{
      attributes: { POSITION: posAccIdx, NORMAL: normAccIdx },
      indices: idxAccIdx,
      material: matIdx
    }]
  });
});

const materials = meshes.map(m => ({
  pbrMetallicRoughness: {
    baseColorFactor: [m.color[0], m.color[1], m.color[2], 1.0],
    metallicFactor: 0.0,
    roughnessFactor: 0.8
  },
  doubleSided: true
}));

const nodes = gltfMeshes.map((_, i) => ({ mesh: i }));
const binBuffer = Buffer.concat(binChunks);

const gltfJson = {
  asset: { version: '2.0', generator: 'Webhaze  Cafe Burger Generator' },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes: gltfMeshes,
  materials,
  accessors,
  bufferViews: bufferViews.map(bv => ({ buffer: 0, ...bv })),
  buffers: [{ byteLength: binBuffer.length }]
};

const jsonStr = JSON.stringify(gltfJson);
const jsonBuf = pad4(Buffer.from(jsonStr, 'utf8'));
const binPadded = pad4(binBuffer);

const totalLen = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
const header = Buffer.allocUnsafe(12);
header.writeUInt32LE(0x46546C67, 0); // magic: glTF
header.writeUInt32LE(2, 4);           // version
header.writeUInt32LE(totalLen, 8);

const jsonChunkHeader = Buffer.allocUnsafe(8);
jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0);
jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

const binChunkHeader = Buffer.allocUnsafe(8);
binChunkHeader.writeUInt32LE(binPadded.length, 0);
binChunkHeader.writeUInt32LE(0x004E4942, 4); // BIN

const glb = Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binPadded]);
const outPath = path.join(__dirname, 'public', 'models', 'burger.glb');
fs.writeFileSync(outPath, glb);
console.log(`Written ${glb.length} bytes to ${outPath}`);
