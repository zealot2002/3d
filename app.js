import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

let scene, camera, renderer, controls;
let model = null;
let mixer = null;
let clock = new THREE.Clock();

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-msg').textContent = message;
  document.getElementById('error').classList.add('show');
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function updateModelInfo(name) {
  const infoEl = document.getElementById('model-info');
  if (infoEl) {
    infoEl.innerHTML = `模型: ${name || '未知'}`;
  }
}

function initScene() {
  const container = document.getElementById('canvas-container');
  const w = window.innerWidth, h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  camera.position.set(5, 3, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1;
  controls.maxDistance = 500;

  window.addEventListener('resize', onResize);
}

function initLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.5);
  sun.position.set(10, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xcce5ff, 0.5);
  fill.position.set(-10, 8, -10);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x88ccff, 0.3);
  rim.position.set(0, 5, 15);
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
  const distance = maxDim * 8;
  
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
}

function setupAnimations(gltf) {
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    
    gltf.animations.forEach(function(clip) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    });
  }
}

function setupFBXAnimations(modelObj) {
  modelObj.traverse(function(child) {
    if (child.animations && child.animations.length > 0) {
      if (!mixer) mixer = new THREE.AnimationMixer(modelObj);
      
      child.animations.forEach(function(clip) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      });
    }
  });
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
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.fbx')) {
      const loader = new FBXLoader();
      try {
        const object = loader.parse(arrayBuffer);
        clearModel();
        model = object;
        
        model.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        scene.add(model);
        autoCenterCamera(model);
        setupFBXAnimations(model);
        updateModelInfo(file.name);
        
        hideLoading();
      } catch (e) {
        showError('FBX parse error: ' + e.message);
      }
    } else {
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
          setupAnimations(gltf);
          updateModelInfo(file.name);
          
          hideLoading();
        } catch (e) {
          showError('File error: ' + e.message);
        }
      }, function(error) {
        showError('Parse error: ' + error.message);
      });
    }
  };
  
  reader.onerror = function() {
    showError('Read error');
  };
  
  reader.readAsArrayBuffer(file);
}

function resetCamera() {
  if (model) {
    autoCenterCamera(model);
  }
}

function initUI() {
  document.querySelector('[data-action="reset"]').addEventListener('click', resetCamera);
  
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
  hideLoading();
  renderLoop();
}

init();