import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let model = null;
let mixer = null;
let actions = {};
let clock = new THREE.Clock();
let isAutoRotate = true;
let isWireframe = false;

const DEMO_MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Parrot.glb';

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-msg').textContent = message;
  document.getElementById('error').classList.add('show');
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function updateModelInfo(name, animCount) {
  const infoEl = document.getElementById('model-info');
  if (infoEl) {
    infoEl.innerHTML = `模型: ${name || '未知'}<br>动画: ${animCount || 0} 个`;
  }
}

function initScene() {
  const container = document.getElementById('canvas-container');
  const w = window.innerWidth, h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 10, 50);

  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  camera.position.set(5, 3, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = 0.5;
  controls.maxDistance = 50;

  window.addEventListener('resize', onResize);
}

function initLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1);
  sun.position.set(10, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xcce5ff, 0.3);
  fill.position.set(-10, 8, -10);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x88ccff, 0.2);
  rim.position.set(0, -5, 15);
  scene.add(rim);
}

function initGround() {
  const groundGeo = new THREE.CircleGeometry(30, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(60, 60, 0x2a2a4a, 0x1a1a2a);
  gridHelper.position.y = 0;
  scene.add(gridHelper);
}

function autoCenterCamera(modelObj) {
  const box = new THREE.Box3().setFromObject(modelObj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  controls.target.copy(center);
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 2.5;
  
  const direction = new THREE.Vector3(1, 0.5, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  
  camera.lookAt(center);
  controls.update();
}

function clearModel() {
  if (model) {
    model.traverse(function(child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(function(m) { m.dispose(); });
        } else {
          child.material.dispose();
        }
      }
    });
    scene.remove(model);
    model = null;
  }
  if (mixer) {
    mixer.stopAllAction();
    mixer = null;
  }
  actions = {};
  removeAnimationSelector();
}

function setupAnimations(gltf) {
  const animCount = gltf.animations ? gltf.animations.length : 0;
  
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    
    gltf.animations.forEach((clip) => {
      console.log('Animation:', clip.name, 'tracks:', clip.tracks.length);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      actions[clip.name] = action;
    });

    const firstAction = Object.values(actions)[0];
    if (firstAction) {
      firstAction.play();
      console.log('Playing:', Object.keys(actions)[0]);
      document.querySelector('[data-action="play"]').classList.add('active');
    }
  } else {
    document.querySelector('[data-action="play"]').classList.remove('active');
    console.log('No animations');
  }
  
  createAnimationSelector();
  return animCount;
}

function removeAnimationSelector() {
  const selector = document.getElementById('animation-selector');
  if (selector) {
    selector.remove();
  }
}

function createAnimationSelector() {
  removeAnimationSelector();
  
  const selector = document.createElement('div');
  selector.id = 'animation-selector';
  selector.style.marginTop = '10px';
  selector.style.borderTop = '1px solid rgba(255,255,255,0.1)';
  selector.style.paddingTop = '10px';
  document.querySelector('.controls').appendChild(selector);
  
  selector.innerHTML = '';
  
  const animNames = Object.keys(actions);
  if (animNames.length === 0) {
    const p = document.createElement('p');
    p.style.color = 'rgba(255,255,255,0.5)';
    p.style.fontSize = '0.8rem';
    p.textContent = '无动画';
    selector.appendChild(p);
    return;
  }
  
  const label = document.createElement('label');
  label.style.color = 'rgba(255,255,255,0.7)';
  label.style.fontSize = '0.75rem';
  label.style.display = 'block';
  label.style.marginBottom = '5px';
  label.textContent = '选择动画:';
  selector.appendChild(label);
  
  const select = document.createElement('select');
  select.style.width = '100%';
  select.style.padding = '8px';
  select.style.border = '1px solid rgba(255,255,255,0.2)';
  select.style.borderRadius = '6px';
  select.style.background = 'rgba(255,255,255,0.05)';
  select.style.color = '#fff';
  select.style.fontSize = '0.8rem';
  select.style.outline = 'none';
  
  animNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => {
    Object.values(actions).forEach(action => action.stop());
    const selectedAction = actions[e.target.value];
    if (selectedAction) {
      selectedAction.reset();
      selectedAction.play();
      document.querySelector('[data-action="play"]').classList.add('active');
    }
  });
  
  selector.appendChild(select);
}

function loadModel(url) {
  clearModel();

  const loader = new GLTFLoader();
  loader.load(
    url,
    function(gltf) {
      try {
        model = gltf.scene;
        
        model.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        autoCenterCamera(model);

        const animCount = setupAnimations(gltf);
        updateModelInfo(url.split('/').pop(), animCount);

        hideLoading();
        console.log('Model loaded:', url);
      } catch (e) {
        showError('Model error: ' + e.message);
      }
    },
    function(progress) {
      if (progress.total > 0) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        document.querySelector('#loading p').textContent = 'Loading... ' + pct + '%';
      }
    },
    function(error) {
      console.error('Load failed:', error);
      showError('Load failed, check URL or upload local file');
    }
  );
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('upload-box').classList.remove('show');
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('error').classList.remove('show');

  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    const loader = new GLTFLoader();
    
    loader.parse(arrayBuffer, '', function(gltf) {
      try {
        clearModel();
        model = gltf.scene;
        
        model.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        autoCenterCamera(model);

        const animCount = setupAnimations(gltf);
        updateModelInfo(file.name, animCount);

        hideLoading();
        console.log('File loaded:', file.name);
      } catch (e) {
        showError('File error: ' + e.message);
      }
    }, function(error) {
      showError('Parse error: ' + error.message);
    });
  };
  
  reader.onerror = function() {
    showError('Read error');
  };
  
  reader.readAsArrayBuffer(file);
}

function toggleAutoRotate() {
  isAutoRotate = !isAutoRotate;
  controls.autoRotate = isAutoRotate;
  document.querySelector('[data-action="autoRotate"]').classList.toggle('active', isAutoRotate);
}

function resetCamera() {
  if (model) {
    autoCenterCamera(model);
  }
}

function toggleWireframe() {
  isWireframe = !isWireframe;
  if (model) {
    model.traverse(function(child) {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(function(m) { m.wireframe = isWireframe; });
        } else {
          child.material.wireframe = isWireframe;
        }
      }
    });
  }
  document.querySelector('[data-action="wireframe"]').classList.toggle('active', isWireframe);
}

function toggleAnimation() {
  if (mixer) {
    const activeAction = Object.values(actions).find(function(a) { return a.isRunning(); });
    if (activeAction) {
      activeAction.stop();
      document.querySelector('[data-action="play"]').classList.remove('active');
    } else {
      const firstAction = Object.values(actions)[0];
      if (firstAction) {
        firstAction.play();
        document.querySelector('[data-action="play"]').classList.add('active');
      }
    }
  }
}

function initUI() {
  document.querySelector('[data-action="autoRotate"]').addEventListener('click', toggleAutoRotate);
  document.querySelector('[data-action="reset"]').addEventListener('click', resetCamera);
  document.querySelector('[data-action="wireframe"]').addEventListener('click', toggleWireframe);
  document.querySelector('[data-action="play"]').addEventListener('click', toggleAnimation);
  
  document.getElementById('file-input').addEventListener('change', handleFileUpload);
  
  const uploadArea = document.querySelector('.upload-area');
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', function() {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      document.getElementById('file-input').files = e.dataTransfer.files;
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderLoop() {
  requestAnimationFrame(renderLoop);
  const delta = clock.getDelta();

  controls.update();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
}

function init() {
  initScene();
  initLights();
  initGround();
  initUI();
  loadModel(DEMO_MODEL_URL);
  renderLoop();
}

init();