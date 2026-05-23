import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const params = new URLSearchParams(location.search);
const modelUrl = params.get('model') || '/models/Sushi_Platter.glb';
const AUTO_ROTATE_SPEED = 0.35;
const TAP_MOVE_PX = 14;

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _hitPoint = new THREE.Vector3();
const _tapNdc = new THREE.Vector2();
const _surfaceNormal = new THREE.Vector3(0, 1, 0);
const _camDir = new THREE.Vector3()
const _dragRight = new THREE.Vector3();
const _dragForward = new THREE.Vector3();

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
let modelFootOffset = 0;

let initialAlphaOffset = null;
let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

function onDeviceOrientation(event) {
  // Skip if alpha is null, using WebXR, or object is already placed
  // After placement, we want the camera fixed and only the model rotates
  if (event.alpha === null || useWebXR || placed) return;

  const alpha = THREE.MathUtils.degToRad(event.alpha); // Z
  const beta = THREE.MathUtils.degToRad(event.beta);   // X
  const gamma = THREE.MathUtils.degToRad(event.gamma); // Y
  const orient = window.orientation ? THREE.MathUtils.degToRad(window.orientation) : 0; // Screen orientation

  if (initialAlphaOffset === null) {
    initialAlphaOffset = alpha;
  }

  const relativeAlpha = alpha - initialAlphaOffset;

  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // -90 deg around X
  const zee = new THREE.Vector3( 0, 0, 1 );

  euler.set( beta, relativeAlpha, - gamma, 'YXZ' );
  camera.quaternion.setFromEuler( euler );
  camera.quaternion.multiply( q1 );
  camera.quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );
}


// Orbit control state for camera
const orbitState = {
  spherical: new THREE.Spherical(),
  target: new THREE.Vector3(),
  rotateSpeed: 0.5,
  zoomSpeed: 0.5,
  minDistance: 0.5,
  maxDistance: 5,
  minPolarAngle: 0.1,
  maxPolarAngle: Math.PI / 2 - 0.1,
  enabled: false,
};

const gesture = {
  prev: null,
  scaleFactor: 1,
  baseScale: 1,
  minScale: 0.25,
  maxScale: 4,
  userInteracting: false,
  idleTimer: null,
  touchMoved: false,
  pointerId: null,
  lastPointer: { x: 0, y: 0 },
  startSpread: 0,
  // Store the world position where the object was placed
  placedWorldPosition: null,
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

  const box = new THREE.Box3().setFromObject(modelMesh);
  modelFootOffset = -box.min.y;
  modelMesh.position.y = modelFootOffset;

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
  setHint('Drag to rotate · Pinch to zoom', 'found');
}

function applyModelScale() {
  if (!modelMesh) return;
  const s = gesture.baseScale * gesture.scaleFactor;
  modelMesh.scale.set(s, s, s);
  modelMesh.position.y = modelFootOffset;
}

function zoomByFactor(factor) {
  gesture.scaleFactor = THREE.MathUtils.clamp(
    gesture.scaleFactor * factor,
    gesture.minScale,
    gesture.maxScale
  );
  applyModelScale();
  markInteracting();
}

/** Drag object along the table plane (screen pixels → world XZ). */
function moveAnchorOnTable(deltaX, deltaY) {
  // Disabled: do not move the object by dragging/grabbing.
  void deltaX;
  void deltaY;
}

/** Map tap position on screen to estimated depth (lower tap ≈ closer table). */
function estimateDistanceFromNdc(ndcX, ndcY) {
  const vertical = THREE.MathUtils.clamp((1 - ndcY) / 2, 0, 1);
  const horizontal = THREE.MathUtils.clamp(1 - Math.abs(ndcX) * 0.35, 0.65, 1);
  return THREE.MathUtils.lerp(2.8, 0.32, Math.pow(vertical, 0.72)) * horizontal;
}

/** Ray through tap intersects a horizontal plane at estimated table height. */
function computeSurfaceHit(ndcX, ndcY) {
  _tapNdc.set(ndcX, ndcY);
  _raycaster.setFromCamera(_tapNdc, camera);

  const dist = estimateDistanceFromNdc(ndcX, ndcY);
  const probe = _raycaster.ray.origin
    .clone()
    .add(_raycaster.ray.direction.clone().normalize().multiplyScalar(dist));

  _plane.setFromNormalAndCoplanarPoint(_surfaceNormal, probe);
  const hit = _raycaster.ray.intersectPlane(_plane, _hitPoint);

  return {
    point: hit ? _hitPoint.clone() : probe,
    normal: _surfaceNormal.clone(),
  };
}

function alignAnchorToSurface(point, normal) {
  // Store the world position where the object is placed
  gesture.placedWorldPosition = point.clone();
  anchor.position.copy(gesture.placedWorldPosition);
  anchor.quaternion.set(0, 0, 0, 1);
  anchor.scale.set(1, 1, 1);

  const flatNormal = normal.clone().normalize();
  if (flatNormal.y < 0.15) {
    anchor.position.copy(gesture.placedWorldPosition);
  } else {
    const toCam = camera.position.clone().sub(gesture.placedWorldPosition);
    toCam.y = 0;
    if (toCam.lengthSq() > 1e-4) {
      anchor.rotation.y = Math.atan2(toCam.x, toCam.z);
    }
  }
}

function placeFromMatrix(matrix) {
  if (!anchor) return;
  const m = new THREE.Matrix4().fromArray(matrix);
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  m.decompose(pos, quat, scale);

  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quat).normalize();
  alignAnchorToSurface(pos, normal);
  attachModelToAnchor();
}

function placeFromRay(ndcX, ndcY) {
  const { point, normal } = computeSurfaceHit(ndcX, ndcY);
  alignAnchorToSurface(point, normal);
  attachModelToAnchor();
}

function updatePlacementPreview(ndcX, ndcY) {
  if (placed || !running || useWebXR) return;
  const { point } = computeSurfaceHit(ndcX, ndcY);
  reticle.position.copy(point);
  reticle.position.y += 0.004;
  reticle.visible = true;
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
  if (gesture.prev && gesture.prev.count >= 2) {
    gesture.startSpread = gesture.prev.spread;
  }
  if (!placed && running && !useWebXR && ev.touches.length === 1) {
    const t = ev.touches[0];
    const ndc = ndcFromClient(t.clientX, t.clientY);
    updatePlacementPreview(ndc.x, ndc.y);
  }
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

  // Preview only before first placement.
  if (!placed && running && !useWebXR && cur.count === 1) {
    const ndc = ndcFromClient(cur.rawX, cur.rawY);
    updatePlacementPreview(ndc.x, ndc.y);
  }

  // Single-finger drag rotates the model around Y axis and X axis (like model-viewer)
  if (placed && cur.count === 1 && gesture.prev.count === 1 && modelMesh) {
    const deltaX = (cur.rawX - gesture.prev.rawX) * (window.innerWidth + window.innerHeight) / 2;
    const deltaY = (cur.rawY - gesture.prev.rawY) * (window.innerWidth + window.innerHeight) / 2;
    const rotationSpeed = 0.005; // Radians per pixel
    
    // Rotate model around Y axis (horizontal drag)
    modelMesh.rotation.y += deltaX * rotationSpeed;
    
    // Rotate model around X axis (vertical drag)
    modelMesh.rotation.x += deltaY * rotationSpeed;
    
    // Clamp X rotation to prevent the plate from flipping upside down
    modelMesh.rotation.x = THREE.MathUtils.clamp(modelMesh.rotation.x, -Math.PI / 3, Math.PI / 3);
    
    markInteracting();
  }

  // Pinch-to-zoom using robust startSpread tracking.
  if (cur.count >= 2 && gesture.prev.count >= 2 && gesture.startSpread > 0) {
    const spreadChange = cur.spread - gesture.prev.spread;
    const zoomFactor = 1 + spreadChange / gesture.startSpread;
    
    // Zoom the model
    zoomByFactor(zoomFactor);
    
    // Also adjust camera distance for smoother zoom
    if (orbitState.enabled) {
      orbitState.spherical.radius = THREE.MathUtils.clamp(
        orbitState.spherical.radius / zoomFactor,
        orbitState.minDistance,
        orbitState.maxDistance
      );
    }
    
    ev.preventDefault();
  }

  gesture.prev = cur;
}

function onTouchEnd(ev) {
  if (ev.touches.length > 0) {
    gesture.prev = null;
    return;
  }
  const t = ev.changedTouches[0];
  if (!t) {
    gesture.prev = null;
    return;
  }

  if (!gesture.touchMoved) {
    onPlaceTap(t.clientX, t.clientY);
    ev.preventDefault();
  }

  gesture.prev = null;
  gesture.touchMoved = false;
}

function onPointerDown(ev) {
  if (ev.pointerType === 'touch') return;
  if (!placed) return;
  gesture.pointerId = ev.pointerId;
  gesture.lastPointer.x = ev.clientX;
  gesture.lastPointer.y = ev.clientY;
  canvas.setPointerCapture(ev.pointerId);
}

function onPointerMove(ev) {
  if (!placed && running && !useWebXR) {
    const ndc = ndcFromClient(ev.clientX, ev.clientY);
    updatePlacementPreview(ndc.x, ndc.y);
    return;
  }

  if (placed && gesture.pointerId === ev.pointerId && modelMesh) {
    const deltaX = ev.clientX - gesture.lastPointer.x;
    const rotationSpeed = 0.007; // Radians per pixel
    modelMesh.rotation.y += deltaX * rotationSpeed;
    gesture.lastPointer.x = ev.clientX;
    gesture.lastPointer.y = ev.clientY;
    markInteracting();
  }
}

function onPointerUp(ev) {
  if (gesture.pointerId === ev.pointerId) {
    gesture.pointerId = null;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }
}

function onWheel(ev) {
  // Disabled entirely (per requirements).
  ev.preventDefault();
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
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
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
    new THREE.RingGeometry(0.06, 0.09, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener('resize', onResize);
  setupGestures();
}

function syncCameraFov() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  if (video?.videoWidth && video.videoHeight) {
    const ratio = video.videoHeight / video.videoWidth;
    const hFov = (55 * Math.PI) / 180;
    const vFov = 2 * Math.atan(ratio * Math.tan(hFov / 2));
    camera.fov = THREE.MathUtils.clamp((vFov * 180) / Math.PI, 42, 72);
  }
  camera.updateProjectionMatrix();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  syncCameraFov();
}

function updateOrbitControls() {
  // Only apply orbit controls in non-WebXR mode when object is placed
  if (useWebXR || !placed || !orbitState.enabled) return;
  
  if (!gesture.placedWorldPosition) return;
  
  // Set the orbit target to the placed object position
  orbitState.target.copy(gesture.placedWorldPosition);
  
  // Calculate camera position from spherical coordinates
  // THREE.Spherical: radius, phi (polar angle from +Y), theta (azimuthal angle in XZ plane)
  const offset = new THREE.Vector3();
  offset.setFromSpherical(orbitState.spherical);
  
  // Update camera position
  camera.position.copy(orbitState.target).add(offset);
  camera.lookAt(orbitState.target);
}

function initOrbitFromCamera() {
  // Initialize orbit state based on current camera position relative to the placed object
  if (!gesture.placedWorldPosition) return;
  
  const offset = new THREE.Vector3().subVectors(camera.position, gesture.placedWorldPosition);
  orbitState.spherical.setFromVector3(offset);
  orbitState.target.copy(gesture.placedWorldPosition);
  orbitState.enabled = true;
}

function updateAutoRotate(dt) {
  // Intentionally disabled to keep the object fixed relative to the world.
  // Zoom is still handled by scaling the model.
  void dt;
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
          const m = new THREE.Matrix4().fromArray(lastHitMatrix);
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const scl = new THREE.Vector3();
          m.decompose(pos, quat, scl);
          reticle.position.copy(pos);
          reticle.quaternion.copy(quat);
          reticle.visible = true;
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

  syncCameraFov();
  reticle.visible = true;
  setHint('Tap the table to place · then drag to move, pinch to zoom');
  running = true;

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    renderFrame();
  }
  loop();
}

async function requestDeviceOrientationPermission() {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    try {
      const permissionState = await DeviceOrientationEvent.requestPermission();
      if (permissionState === 'granted') {
        window.addEventListener('deviceorientation', onDeviceOrientation, true);
        console.log('[AR] Gyroscope permission granted');
      } else {
        console.warn('[AR] Gyroscope permission denied');
      }
    } catch (err) {
      console.error('[AR] Error requesting gyroscope permission:', err);
    }
  } else {
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
  }
}

async function startAR() {
  if (running) return;

  await requestDeviceOrientationPermission();

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
