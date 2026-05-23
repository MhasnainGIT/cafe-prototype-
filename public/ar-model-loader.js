/* global AFRAME, THREE */
(function () {
  function getDracoPath() {
    try {
      var script = document.currentScript;
      if (!script) {
        script = Array.prototype.find.call(document.scripts, function (s) {
          return s.src && s.src.indexOf('ar-model-loader') !== -1;
        });
      }
      if (script && script.src) {
        return script.src.replace(/[^/]+$/, '') + 'draco/gltf/';
      }
    } catch (e) { /* fall through */ }
    return (window.location.origin || '') + '/draco/gltf/';
  }

  function getResponsiveScale() {
    var minDim = Math.min(window.innerWidth, window.innerHeight);
    // Working Hiro demos use ~5; keep readable on phones, scale up on tablets
    return Math.max(5, Math.min(12, minDim / 72));
  }

  function createLoader() {
    var loader = new THREE.GLTFLoader();
    if (typeof THREE.DRACOLoader !== 'undefined') {
      var dracoLoader = new THREE.DRACOLoader();
      var path = getDracoPath();
      dracoLoader.setDecoderPath(path);
      dracoLoader.setDecoderConfig({ type: 'wasm' });
      loader.setDRACOLoader(dracoLoader);
      console.log('[AR] Draco decoder path:', path);
    }
    return loader;
  }

  function prepareModelMeshes(model) {
    model.traverse(function (node) {
      if (!node.isMesh || !node.material) return;

      var name = (node.name || '').toLowerCase();
      if (/plane|background|shadow|quad|floor|base/.test(name)) {
        node.visible = false;
        return;
      }

      var mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(function (mat) {
        if (mat.color && mat.color.getHex() === 0x000000 && mat.metalness === 0 && !mat.map) {
          node.visible = false;
          return;
        }
        mat.side = THREE.DoubleSide;
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        mat.needsUpdate = true;
      });
    });
  }

  AFRAME.registerComponent('ar-gltf-model', {
    schema: {
      src: { type: 'string' },
      position: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    },

    init: function () {
      var el = this.el;
      var data = this.data;
      if (!data.src) return;
      this._loadModel(data.src);
      this._onResize = this._onResize.bind(this);
      window.addEventListener('resize', this._onResize);
    },

    update: function (oldData) {
      if (oldData.src !== this.data.src && this.data.src) {
        this._loadModel(this.data.src);
      }
    },

    _loadModel: function (src) {
      var el = this.el;
      var data = this.data;
      var scale = getResponsiveScale();
      var loader = createLoader();

      loader.load(
        src,
        function (gltf) {
          var model = gltf.scene;
          prepareModelMeshes(model);
          model.scale.set(scale, scale, scale);
          model.position.set(data.position.x, data.position.y, data.position.z);

          el.setObject3D('mesh', model);
          el.emit('model-loaded', { format: 'gltf', model: model, baseScale: scale });
        },
        undefined,
        function (err) {
          console.error('[AR] gltf load failed', err);
          el.emit('model-error', err);
        }
      );
    },

    _onResize: function () {
      var el = this.el;
      var mesh = el.getObject3D('mesh');
      if (!mesh) return;
      var s = getResponsiveScale();
      mesh.scale.set(s, s, s);
      el.emit('model-resized', { scale: s });
    },

    remove: function () {
      window.removeEventListener('resize', this._onResize);
    },
  });

  AFRAME.registerComponent('ar-auto-rotate', {
    schema: {
      speed: { type: 'number', default: 18 },
      enabled: { type: 'boolean', default: true },
    },

    init: function () {
      this.markerVisible = false;
      this.userInteracting = false;
      this.idleTimer = null;

      var marker = this.el.closest('a-marker') || document.querySelector('a-marker');
      if (marker) {
        marker.addEventListener('markerFound', this._onMarkerFound = function () {
          this.markerVisible = true;
        }.bind(this));
        marker.addEventListener('markerLost', this._onMarkerLost = function () {
          this.markerVisible = false;
        }.bind(this));
      }

      this._onFingerMove = function () {
        this.userInteracting = true;
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(function () {
          this.userInteracting = false;
        }.bind(this), 1200);
      }.bind(this);

      this.el.sceneEl.addEventListener('onefingermove', this._onFingerMove);
      this.el.sceneEl.addEventListener('twofingermove', this._onFingerMove);
    },

    remove: function () {
      var marker = this.el.closest('a-marker') || document.querySelector('a-marker');
      if (marker && this._onMarkerFound) {
        marker.removeEventListener('markerFound', this._onMarkerFound);
        marker.removeEventListener('markerLost', this._onMarkerLost);
      }
      this.el.sceneEl.removeEventListener('onefingermove', this._onFingerMove);
      this.el.sceneEl.removeEventListener('twofingermove', this._onFingerMove);
    },

    tick: function (_t, dt) {
      if (!this.data.enabled || !this.markerVisible || this.userInteracting) return;
      var rad = (this.data.speed * Math.PI) / 180;
      this.el.object3D.rotation.y += rad * (dt / 1000);
    },
  });
})();
