/* global AFRAME, THREE */

AFRAME.registerComponent('gesture-handler', {
  schema: {
    enabled: { default: true },
    rotationFactor: { default: 4 },
    minScale: { default: 0.5 },
    maxScale: { default: 6 },
  },

  init: function () {
    this.handleScale = this.handleScale.bind(this);
    this.handleRotation = this.handleRotation.bind(this);

    this.isVisible = false;
    this.initialScale = new THREE.Vector3(1, 1, 1);
    this.scaleFactor = 1;

    var marker = this.el.closest('a-marker') || document.querySelector('a-marker');
    if (marker) {
      marker.addEventListener('markerFound', this._onFound = function () {
        this.isVisible = true;
      }.bind(this));
      marker.addEventListener('markerLost', this._onLost = function () {
        this.isVisible = false;
      }.bind(this));
    }

    this.el.addEventListener('model-loaded', this._onModelLoaded = function () {
      this.initialScale.copy(this.el.object3D.scale);
      this.scaleFactor = 1;
    }.bind(this));

    this.el.addEventListener('model-resized', this._onModelLoaded);
  },

  update: function () {
    if (this.data.enabled) {
      this.el.sceneEl.addEventListener('onefingermove', this.handleRotation);
      this.el.sceneEl.addEventListener('twofingermove', this.handleScale);
    } else {
      this.el.sceneEl.removeEventListener('onefingermove', this.handleRotation);
      this.el.sceneEl.removeEventListener('twofingermove', this.handleScale);
    }
  },

  remove: function () {
    var marker = this.el.closest('a-marker') || document.querySelector('a-marker');
    if (marker && this._onFound) {
      marker.removeEventListener('markerFound', this._onFound);
      marker.removeEventListener('markerLost', this._onLost);
    }
    this.el.removeEventListener('model-loaded', this._onModelLoaded);
    this.el.removeEventListener('model-resized', this._onModelLoaded);
    this.el.sceneEl.removeEventListener('onefingermove', this.handleRotation);
    this.el.sceneEl.removeEventListener('twofingermove', this.handleScale);
  },

  handleRotation: function (event) {
    if (!this.isVisible) return;
    this.el.object3D.rotation.y += event.detail.positionChange.x * this.data.rotationFactor;
    this.el.object3D.rotation.x += event.detail.positionChange.y * this.data.rotationFactor;
  },

  handleScale: function (event) {
    if (!this.isVisible || !event.detail.startSpread) return;
    this.scaleFactor *= 1 + event.detail.spreadChange / event.detail.startSpread;
    this.scaleFactor = Math.min(Math.max(this.scaleFactor, this.data.minScale), this.data.maxScale);
    this.el.object3D.scale.set(
      this.scaleFactor * this.initialScale.x,
      this.scaleFactor * this.initialScale.y,
      this.scaleFactor * this.initialScale.z
    );
  },
});
