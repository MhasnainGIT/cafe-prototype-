import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const params = new URLSearchParams(location.search);
const modelUrl = params.get('model') || '/models/Sushi_Platter.glb';
const SCALE_MIN = 0.1;
const SCALE_MAX = 10.0;

const _raycaster = new THREE.Raycaster();
const _v3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _m4 = new THREE.Matrix4();

const hint = document.getElementById('hint');
const canvas = document.getElementById('ar-canvas');
const video = document.getElementById('ar-video');
const container = document.getElementById('ar-container');
const startBtn = document.getElementById('start-ar-btn');

let renderer, scene, camera, anchor, modelMesh, mixer, shadowPlane;
const clock = new THREE.Clock();
let placed = false;
let useWebXR = false;
let xrSession = null;
let xrRefSpace = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let lastHitMatrix = null;
let reticle, uiOverlay, loadingBarContainer, loadingBar;
let stream = null;
let running = false;
let modelFootOffset = 0;

let initialAlphaOffset = null;
let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

function onDeviceOrientation(event) {
  // Always update camera rotation in fallback mode to keep the world static.
  // If we stop updating, the model will appear 'stuck' to the phone screen.
  if (event.alpha === null || useWebXR) return;


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

const gesture = {
  active: false,
  pinchDistance: 0,
  initialScale: 1,
  lastRotateX: 0,
  lastRotateY: 0,
  touchMoved: false,
  holdTimer: null,
  isDragging: false,
};

/** Create dynamic UI for instructions and reset */
function createUI() {
  uiOverlay = document.createElement('div');
  uiOverlay.id = 'ar-ui-overlay';
  uiOverlay.style = `
    position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.7); color: white; padding: 12px 24px;
    border-radius: 30px; font-family: sans-serif; pointer-events: none;
    text-align: center; transition: opacity 0.3s; z-index: 100;
  `;
  document.body.appendChild(uiOverlay);

  // Loading Progress UI
  loadingBarContainer = document.createElement('div');
  loadingBarContainer.style = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 200px; display: flex; flex-direction: column; align-items: center;
    z-index: 1000; transition: opacity 0.3s ease;
  `;

  const loadingText = document.createElement('div');
  loadingText.textContent = 'Loading 3D Model...';
  loadingText.style = 'color: white; font-family: sans-serif; font-size: 14px; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);';
  loadingBarContainer.appendChild(loadingText);

  const barTrack = document.createElement('div');
  barTrack.style = 'width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;';
  
  loadingBar = document.createElement('div');
  loadingBar.style = 'width: 0%; height: 100%; background: #ffffff; transition: width 0.1s linear;';
  
  barTrack.appendChild(loadingBar);
  loadingBarContainer.appendChild(barTrack);
  document.body.appendChild(loadingBarContainer);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '↺ Reset Placement';
  resetBtn.style = `
    position: fixed; top: 20px; right: 20px; padding: 10px 15px;
    background: rgba(255,255,255,0.2); border: 1px solid white; color: white;
    border-radius: 8px; font-size: 12px; cursor: pointer; display: none; z-index: 101;
  `;
  resetBtn.onclick = () => {
    placed = false;
    anchor.visible = false;
    resetBtn.style.display = 'none';
    updateUI('Move camera to find surface');
  };
  document.body.appendChild(resetBtn);
  return { resetBtn };
}

function updateUI(text) {
  if (uiOverlay) uiOverlay.textContent = text;
}

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

/** Center and normalize model bounds */
function normalizeModel(group) {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  // Center XZ and set Y to sit on floor
  group.position.set(-center.x, -box.min.y, -center.z);
  return size.y;
}

function prepareModelMeshes(model) {
  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const name = (node.name || '').toLowerCase();
    if (/plane|background|shadow|quad|floor|base/.test(name)) {
      node.visible = false; // Hide baked environment floors
      node.castShadow = false;
      node.receiveShadow = false;
      return;
    }
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((mat) => {
      if (mat.color?.getHex() === 0x000000 && mat.metalness === 0 && !mat.map) {
        node.visible = false;
        return;
      }
      mat.side = THREE.DoubleSide;
      node.castShadow = true;
      node.receiveShadow = true;
    });
  });
}

function createAnchor() {
  anchor = new THREE.Group();
  scene.add(anchor);
  anchor.visible = false;

  // Shadow Catcher Plane
  const geometry = new THREE.PlaneGeometry(20, 20);
  geometry.rotateX(-Math.PI / 2);
  shadowPlane = new THREE.Mesh(geometry, new THREE.ShadowMaterial({ opacity: 0.4 }));
  shadowPlane.receiveShadow = true;
  anchor.add(shadowPlane);
}

async function loadModel() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  try {
    draco.setDecoderPath(getDracoPath());
    loader.setDRACOLoader(draco);
  } catch (e) { console.warn("Draco not configured", e); }

  const gltf = await loader.loadAsync(modelUrl, (xhr) => {
    if (xhr.lengthComputable) {
      const percent = (xhr.loaded / xhr.total) * 100;
      if (loadingBar) loadingBar.style.width = `${percent}%`;
    }
  });

  if (loadingBarContainer) {
    loadingBarContainer.style.opacity = '0';
    setTimeout(() => { if (loadingBarContainer.parentNode) loadingBarContainer.remove(); }, 300);
  }

  modelMesh = gltf.scene;
  prepareModelMeshes(gltf.scene);
  normalizeModel(modelMesh);

  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(modelMesh);
    mixer.clipAction(gltf.animations[0]).play();
  }
}

function placeFromRay(ndcX, ndcY) {
  // Simplified fallback placement logic (not used in primary WebXR mode)
  anchor.position.set(0, -1, -2);
  onModelPlaced();
}

function onModelPlaced() {
  if (placed) return;
  if (!anchor.children.includes(modelMesh)) anchor.add(modelMesh);
  
  anchor.visible = true;
  placed = true;
  reticle.visible = false;
  
  // Reset transform
  modelMesh.rotation.set(0, 0, 0);
  modelMesh.scale.set(0.01, 0.01, 0.01); // Start small for pop-in effect
  
  // Soft landing animation
  new Promise(res => {
    let s = 0.01;
    const itv = setInterval(() => {
      s += 0.15;
      if (s >= 1) { s = 1; clearInterval(itv); res(); }
      modelMesh.scale.set(s, s, s);
    }, 16);
  });

  updateUI('Drag to rotate · Pinch to scale');
  document.querySelector('button[onclick*="Reset"]').style.display = 'block';
}

function ndcFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

function onPlaceTap(clientX, clientY) {
  if (placed) return;
  if (useWebXR && lastHitMatrix) {
    _m4.fromArray(lastHitMatrix);
    anchor.position.setFromMatrixPosition(_m4);
    anchor.quaternion.setFromRotationMatrix(_m4);
    onModelPlaced();
    return;
  }
  const ndc = ndcFromClient(clientX, clientY);
  placeFromRay(ndc.x, ndc.y);
}

function onTouchStart(ev) {
  if (ev.touches.length === 1) {
    gesture.active = true;
    gesture.lastRotateX = ev.touches[0].pageX;
    gesture.lastRotateY = ev.touches[0].pageY;
    gesture.touchMoved = false;

    if (placed) {
      // Detect long press to start dragging/repositioning
      gesture.holdTimer = setTimeout(() => {
        if (!gesture.touchMoved) {
          gesture.isDragging = true;
          if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
          updateUI('Repositioning model...');
        }
      }, 600);
    }
  } else if (ev.touches.length === 2) {
    if (gesture.holdTimer) clearTimeout(gesture.holdTimer);
    gesture.pinchDistance = Math.hypot(
      ev.touches[1].pageX - ev.touches[0].pageX,
      ev.touches[1].pageY - ev.touches[0].pageY
    );
    gesture.initialScale = modelMesh.scale.x;
  }
}

function onTouchMove(ev) {
  if (!placed || !gesture.active) return;

  if (ev.touches.length === 1) {
    const deltaX = ev.touches[0].pageX - gesture.lastRotateX;
    const deltaY = ev.touches[0].pageY - gesture.lastRotateY;

    // If finger moves significantly, it's a rotation, not a hold
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      gesture.touchMoved = true;
      if (gesture.holdTimer) clearTimeout(gesture.holdTimer);
    }

    if (gesture.isDragging) {
      // Movement is handled by updating anchor position in renderFrame hit-test
    } else {
      // Standard rotation logic
      modelMesh.rotation.y += deltaX * 0.01;
      modelMesh.rotation.x += deltaY * 0.01;
    }

    gesture.lastRotateX = ev.touches[0].pageX;
    gesture.lastRotateY = ev.touches[0].pageY;
  } else if (ev.touches.length === 2) {
    const dist = Math.hypot(
      ev.touches[1].pageX - ev.touches[0].pageX,
      ev.touches[1].pageY - ev.touches[0].pageY
    );
    const ratio = dist / gesture.pinchDistance;
    const newScale = THREE.MathUtils.clamp(gesture.initialScale * ratio, SCALE_MIN, SCALE_MAX);
    modelMesh.scale.set(newScale, newScale, newScale);
    updateUI(`Scale: ${Math.round(newScale * 100)}%`);
  }
}

function onTouchEnd(ev) {
  if (gesture.holdTimer) clearTimeout(gesture.holdTimer);
  
  gesture.isDragging = false;
  gesture.active = false;
  if (ev.touches.length === 0 && !placed) {
    const t = ev.changedTouches[0];
    onPlaceTap(t.clientX, t.clientY);
    ev.preventDefault();
  }
  if (placed) updateUI('Drag to rotate · Pinch to scale');
}

function setupGestures() {
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.xr.enabled = true;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 4, 2);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.far = 10;
  scene.add(dir);

  createAnchor();

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.09, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener('resize', onResize);
  setupGestures();
  createUI();
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

function renderFrame(_t, frame) {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);

  if (useWebXR && frame && hitTestSource && xrRefSpace) {
    const hits = frame.getHitTestResults(hitTestSource);
    if (hits.length) {
      const pose = hits[0].getPose(xrRefSpace);
      if (pose) {
        lastHitMatrix = pose.transform.matrix;
        reticle.matrix.fromArray(lastHitMatrix);

        // Update model transform if user is currently "holding to move"
        if (gesture.isDragging) {
          _m4.fromArray(lastHitMatrix);
          anchor.position.setFromMatrixPosition(_m4);
          anchor.quaternion.setFromRotationMatrix(_m4);
        }

        reticle.visible = !placed || gesture.isDragging;
        if (!placed) updateUI('Tap to place');
      } else {
        reticle.visible = false;
      }
    } else if (!placed) {
      reticle.visible = false;
    }
  }

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
    } catch (err) { console.warn('[AR] hit-test unavailable', err); }
  }

  // Light Estimation support
  if (xrSession.requestLightProbe) {
    xrSession.requestLightProbe().then(probe => {
      console.log("[AR] Light probe acquired");
    });
  }

  xrSession.addEventListener('select', () => {
    if (lastHitMatrix) {
      anchor.position.setFromMatrixPosition(_m4.fromArray(lastHitMatrix));
      onModelPlaced();
    }
  });

  updateUI('Move camera to find surface');
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
  updateUI('Tap screen to place');
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
    if (loadingBarContainer) loadingBarContainer.remove();
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
