import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const params = new URLSearchParams(location.search);
const modelUrl = params.get('model') || '/models/Sushi_Platter.glb';
const PLACE_DISTANCE = 1.15;
const AUTO_ROTATE_SPEED = 0.35;
const TAP_MOVE_PX = 14;

const hint = document.getElementById('hint');
const canvas = document.getElementById('ar-canvas');
const video = document.getElementById('ar-video');
const container = document.getElementById('ar-container');
const startBtn = document.getElementById('start-ar-btn');

let renderer, scene, camera, anchor, modelMesh, mixer;
const clock = new THREE.Clock();
let placed = false;
let useWebXR = false;
let xrSession = null;
let xrRefSpace = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let lastHitMatrix = null;
let reticle = null;
let stream = null;
let running = false;

const gesture = {
  prev: null,
  scaleFactor: 1,
  baseScale: 1,
  userInteracting: false,
  idleTimer: null,
  touchMoved: false,
};

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isLocalhost() {
  return /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
}

function cameraErrorMessage(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera blocked — allow camera for this site in browser settings, then refresh.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is in use by another app — close it and try again.';
  }
  if (!window.isSecureContext) {
    return 'Use http://localhost:5173 (not https) or deploy with a valid certificate.';
  }
  return `Camera failed (${name || 'unknown'}). Refresh and try again.`;
}

function setHint(text, type) {
  hint.textContent = text;
  hint.classList.remove('found', 'error');
  if (type) hint.classList.add(type);
}

function getResponsiveScale() {
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(0.35, Math.min(0.85, minDim / 900));
}

function getDracoPath() {
  return `${window.location.origin}/draco/gltf/`;
}

function prepareModelMeshes(model) {
  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const name = (node.name || '').toLowerCase();
    if (/plane|background|shadow|quad|floor|base/.test(name)) {
      node.visible = false;
      return;
    }
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((mat) => {
      if (mat.color?.getHex() === 0x000000 && mat.metalness === 0 && !mat.map) {
        node.visible = false;
        return;
      }
      mat.side = THREE.DoubleSide;
      mat.needsUpdate = true;
    });
  });
}

function createAnchor() {
  anchor = new THREE.Group();
  scene.add(anchor);
  anchor.visible = false;
}

async function loadModel() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(getDracoPath());
  draco.setDecoderConfig({ type: 'wasm' });
  loader.setDRACOLoader(draco);

  const gltf = await loader.loadAsync(modelUrl);
  prepareModelMeshes(gltf.scene);
  const s = getResponsiveScale();
  modelMesh = gltf.scene;
  modelMesh.scale.set(s, s, s);
  gesture.baseScale = s;
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(modelMesh);
    mixer.clipAction(gltf.animations[0]).play();
  }
}

function attachModelToAnchor() {
  if (!anchor || !modelMesh || anchor.children.includes(modelMesh)) return;
  anchor.add(modelMesh);
  anchor.visible = true;
  placed = true;
  reticle.visible = false;
  setHint('Pinch to resize · drag to rotate', 'found');
}

function placeFromMatrix(matrix) {
  if (!anchor) return;
  anchor.matrix.fromArray(matrix);
  anchor.matrix.decompose(anchor.position, anchor.quaternion, anchor.scale);
  anchor.scale.set(1, 1, 1);
  attachModelToAnchor();
}

function placeFromRay(ndcX, ndcY) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const point = raycaster.ray.origin
    .clone()
    .add(raycaster.ray.direction.clone().normalize().multiplyScalar(PLACE_DISTANCE));
  anchor.position.copy(point);
  anchor.rotation.set(0, 0, 0);
  attachModelToAnchor();
}

function ndcFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

function onPlaceTap(clientX, clientY) {
  if (gesture.userInteracting) return;
  if (useWebXR && lastHitMatrix) {
    placeFromMatrix(lastHitMatrix);
    return;
  }
  const ndc = ndcFromClient(clientX, clientY);
  placeFromRay(ndc.x, ndc.y);
}

function markInteracting() {
  gesture.userInteracting = true;
  clearTimeout(gesture.idleTimer);
  gesture.idleTimer = setTimeout(() => {
    gesture.userInteracting = false;
  }, 1400);
}

function touchState(ev) {
  if (!ev.touches.length) return null;
  const list = [...ev.touches];
  const cx = list.reduce((s, t) => s + t.clientX, 0) / list.length;
  const cy = list.reduce((s, t) => s + t.clientY, 0) / list.length;
  const sc = 2 / (window.innerWidth + window.innerHeight);
  const state = { count: list.length, x: cx * sc, y: cy * sc, rawX: cx, rawY: cy, spread: 0 };
  if (list.length >= 2) {
    state.spread =
      (list.reduce((sum, t) => sum + Math.hypot(cx - t.clientX, cy - t.clientY), 0) / list.length) * sc;
  }
  return state;
}

function onTouchStart(ev) {
  if (ev.touches.length > 2) return;
  gesture.touchMoved = false;
  gesture.prev = touchState(ev);
  if (gesture.prev) gesture.prev.startSpread = gesture.prev.spread;
}

function onTouchMove(ev) {
  const cur = touchState(ev);
  if (!cur || !gesture.prev) {
    gesture.prev = cur;
    return;
  }
  if (Math.hypot(cur.rawX - gesture.prev.rawX, cur.rawY - gesture.prev.rawY) > TAP_MOVE_PX) {
    gesture.touchMoved = true;
  }
  if (!placed || !anchor) {
    gesture.prev = cur;
    return;
  }
  if (cur.count === 1 && gesture.prev.count === 1) {
    markInteracting();
    anchor.rotation.y += (cur.x - gesture.prev.x) * 4;
    anchor.rotation.x += (cur.y - gesture.prev.y) * 4;
    ev.preventDefault();
  }
  if (cur.count >= 2 && gesture.prev.startSpread) {
    markInteracting();
    const spreadChange = cur.spread - gesture.prev.spread;
    gesture.scaleFactor *= 1 + spreadChange / gesture.prev.startSpread;
    gesture.scaleFactor = Math.max(0.4, Math.min(3, gesture.scaleFactor));
    const s = gesture.baseScale * gesture.scaleFactor;
    modelMesh.scale.set(s, s, s);
    ev.preventDefault();
  }
  gesture.prev = cur;
}

function onTouchEnd(ev) {
  if (gesture.touchMoved || ev.touches.length > 0) {
    gesture.prev = null;
    return;
  }
  const t = ev.changedTouches[0];
  if (!t) return;
  if (!placed) {
    onPlaceTap(t.clientX, t.clientY);
    ev.preventDefault();
  } else if (!gesture.userInteracting) {
    onPlaceTap(t.clientX, t.clientY);
    ev.preventDefault();
  }
  gesture.prev = null;
}

function onCanvasClick(ev) {
  if (ev.pointerType === 'touch') return;
  onPlaceTap(ev.clientX, ev.clientY);
}

function setupGestures() {
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('click', onCanvasClick);
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.xr.enabled = true;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(1, 2, 1);
  scene.add(dir);

  createAnchor();

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.07, 0.095, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener('resize', onResize);
  setupGestures();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function updateAutoRotate(dt) {
  if (!placed || !anchor || gesture.userInteracting) return;
  anchor.rotation.y += AUTO_ROTATE_SPEED * dt;
}

function renderFrame(_t, frame) {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);

  if (useWebXR && frame && hitTestSource && xrRefSpace) {
    const hits = frame.getHitTestResults(hitTestSource);
    if (hits.length) {
      const pose = hits[0].getPose(xrRefSpace);
      if (pose) {
        lastHitMatrix = pose.transform.matrix;
        if (!placed) {
          reticle.visible = true;
          reticle.matrix.fromArray(lastHitMatrix);
        }
      }
    } else if (!placed) {
      reticle.visible = false;
    }
  }

  updateAutoRotate(dt);
  renderer.render(scene, camera);
}

async function requestHitTest(session) {
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  hitTestSourceRequested = true;
}

async function startWebXR() {
  useWebXR = true;
  video.style.display = 'none';
  container.classList.add('xr-active');

  const tryInit = async (init) => navigator.xr.requestSession('immersive-ar', init);

  try {
    xrSession = await tryInit({
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor', 'dom-overlay'],
      domOverlay: { root: document.body },
    });
  } catch {
    xrSession = await tryInit({ optionalFeatures: ['hit-test', 'local-floor'] });
  }

  xrSession.addEventListener('end', () => {
    running = false;
    window.close();
  });

  await renderer.xr.setSession(xrSession);
  xrRefSpace = await xrSession.requestReferenceSpace('local');

  if (!hitTestSourceRequested) {
    try {
      await requestHitTest(xrSession);
    } catch (err) {
      console.warn('[AR] hit-test unavailable', err);
    }
  }

  xrSession.addEventListener('select', () => {
    if (lastHitMatrix) placeFromMatrix(lastHitMatrix);
  });

  setHint('Aim at a surface, then tap to place');
  renderer.setAnimationLoop(renderFrame);
  running = true;
}

async function acquireCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API not available in this browser');
  }

  const tries = [
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: true },
  ];

  let lastErr;
  for (const constraints of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, ...constraints });
    } catch (err) {
      lastErr = err;
      console.warn('[AR] getUserMedia attempt failed', constraints, err);
    }
  }
  throw lastErr;
}

async function startCameraFallback() {
  useWebXR = false;
  video.style.display = 'block';

  stream = await acquireCameraStream();
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  try {
    await video.play();
  } catch (playErr) {
    console.warn('[AR] video.play()', playErr);
  }

  if (video.readyState < 2) {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Camera stream timed out')), 8000);
      video.onloadedmetadata = () => {
        clearTimeout(t);
        resolve();
      };
    });
    await video.play().catch(() => {});
  }

  setHint('Tap the table or any surface to place the dish');
  running = true;

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    renderFrame();
  }
  loop();
}

async function startAR() {
  if (running) return;

  if (!window.isSecureContext) {
    const fixUrl = isLocalhost()
      ? `http://localhost:${location.port || '5173'}${location.pathname}${location.search}`
      : null;
    setHint(
      fixUrl
        ? `Not secure — open ${fixUrl} instead of https`
        : 'This page must be served over HTTPS with a valid certificate.',
      'error'
    );
    return;
  }

  startBtn.style.display = 'none';
  setHint('Starting camera…');

  const tryWebXR = isMobileDevice() && navigator.xr?.isSessionSupported;
  if (tryWebXR) {
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (supported) {
        await startWebXR();
        return;
      }
    } catch (err) {
      console.warn('[AR] WebXR unavailable, using camera', err);
    }
  }

  await startCameraFallback();
}

async function init() {
  setupScene();
  try {
    await loadModel();
  } catch (err) {
    console.error(err);
    setHint('Could not load 3D model', 'error');
    startBtn.disabled = true;
    return;
  }

  if (location.protocol === 'https:' && isLocalhost()) {
    const httpUrl = `http://localhost:${location.port || '5173'}${location.pathname}${location.search}`;
    setHint(`For local dev use ${httpUrl} — avoids certificate errors`);
  }

  const xrMaybe =
    isMobileDevice() &&
    navigator.xr &&
    (await navigator.xr.isSessionSupported?.('immersive-ar').catch(() => false));
  startBtn.textContent = xrMaybe ? 'Start AR' : 'Start camera';
  startBtn.addEventListener('click', () => {
    startAR().catch((err) => {
      console.error('[AR]', err);
      setHint(cameraErrorMessage(err), 'error');
      startBtn.style.display = 'block';
      startBtn.disabled = false;
      running = false;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    });
  });
}

init();
