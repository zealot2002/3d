import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CONFIG } from './config.js';

let scene, camera, renderer, controls;
let sceneModel = null;
let characterModel = null;
let mixers = [];
let clock = new THREE.Clock();
let loadedCount = 0;

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-msg').textContent = message;
  document.getElementById('error').classList.add('show');
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function updateModelInfo() {
  const infoEl = document.getElementById('model-info');
  if (infoEl) {
    let info = '';
    if (sceneModel) info += '场景已加载 ';
    if (characterModel) info += '人物已加载';
    infoEl.innerHTML = info || '未加载模型';
  }
}

function initScene() {
  const container = document.getElementById('canvas-container');
  const w = window.innerWidth, h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.rendering.background);

  camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, w / h, CONFIG.camera.near, CONFIG.camera.far);
  camera.position.set(CONFIG.camera.initialPosition.x, CONFIG.camera.initialPosition.y, CONFIG.camera.initialPosition.z);

  renderer = new THREE.WebGLRenderer({ antialias: CONFIG.rendering.antialias });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.camera.dampingFactor;
  controls.minDistance = CONFIG.camera.minDistance;
  controls.maxDistance = CONFIG.camera.maxDistance;

  window.addEventListener('resize', onResize);
}

function initLights() {
  const ambient = new THREE.AmbientLight(CONFIG.lighting.ambientColor, CONFIG.lighting.ambientIntensity);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(CONFIG.lighting.sunColor, CONFIG.lighting.sunIntensity);
  sun.position.set(CONFIG.lighting.sunPosition.x, CONFIG.lighting.sunPosition.y, CONFIG.lighting.sunPosition.z);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.rendering.shadowMapSize, CONFIG.rendering.shadowMapSize);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(CONFIG.lighting.fillColor, CONFIG.lighting.fillIntensity);
  fill.position.set(CONFIG.lighting.fillPosition.x, CONFIG.lighting.fillPosition.y, CONFIG.lighting.fillPosition.z);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(CONFIG.lighting.rimColor, CONFIG.lighting.rimIntensity);
  rim.position.set(CONFIG.lighting.rimPosition.x, CONFIG.lighting.rimPosition.y, CONFIG.lighting.rimPosition.z);
  scene.add(rim);
}

function initGround() {
  const groundGeo = new THREE.CircleGeometry(CONFIG.ground.radius, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: CONFIG.ground.color, roughness: CONFIG.ground.roughness });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(CONFIG.ground.gridSize, CONFIG.ground.gridDivisions, 0x2a2a4a, 0x1a1a2a);
  gridHelper.position.y = 0;
  scene.add(gridHelper);
}

function autoCenterCamera() {
  const box = new THREE.Box3();
  
  if (sceneModel) box.expandByObject(sceneModel);
  if (characterModel) box.expandByObject(characterModel);
  
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  console.log('联合包围盒中心:', center.x, center.y, center.z);
  console.log('联合包围盒尺寸:', size.x, size.y, size.z);
  
  controls.target.copy(center);
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * CONFIG.camera.autoCenterScale;
  
  const direction = new THREE.Vector3(
    CONFIG.camera.autoCenterDirection.x,
    CONFIG.camera.autoCenterDirection.y,
    CONFIG.camera.autoCenterDirection.z
  ).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  
  console.log('相机位置:', camera.position.x, camera.position.y, camera.position.z);
  
  camera.lookAt(center);
  controls.update();
}

function onModelLoaded() {
  loadedCount++;
  console.log('已加载模型数量:', loadedCount);
  autoCenterCamera();
  
  if (loadedCount >= 2) {
    hideLoading();
  } else if (loadedCount === 1) {
    console.log('等待第二个模型加载...');
  }
}

function setupAnimations(gltf, modelObj) {
  if (gltf.animations && gltf.animations.length > 0) {
    const animMixer = new THREE.AnimationMixer(modelObj);
    mixers.push(animMixer);
    
    gltf.animations.forEach(function(clip) {
      const action = animMixer.clipAction(clip);
      action.setLoop(CONFIG.animation.loopMode, Infinity);
      action.timeScale = CONFIG.animation.speed;
      action.play();
    });
  }
}

function setupFBXAnimations(modelObj) {
  modelObj.traverse(function(child) {
    if (child.animations && child.animations.length > 0) {
      let animMixer = mixers.find(function(m) { return m._root === modelObj; });
      if (!animMixer) {
        animMixer = new THREE.AnimationMixer(modelObj);
        mixers.push(animMixer);
      }
      
      child.animations.forEach(function(clip) {
        const action = animMixer.clipAction(clip);
        action.setLoop(CONFIG.animation.loopMode, Infinity);
        action.timeScale = CONFIG.animation.speed;
        action.play();
      });
    }
  });
}

function loadScene() {
  console.log('开始加载场景模型...');
  const loader = new GLTFLoader();
  loader.load(CONFIG.model.scenePath, function(gltf) {
    console.log('场景模型加载成功');
    sceneModel = gltf.scene;
    
    const box = new THREE.Box3().setFromObject(sceneModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('场景模型尺寸:', size.x, size.y, size.z);
    
    sceneModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(sceneModel);
    setupAnimations(gltf, sceneModel);
    updateModelInfo();
    onModelLoaded();
  }, function(xhr) {
    console.log('场景加载进度:', Math.round(xhr.loaded / xhr.total * 100) + '%');
  }, function(error) {
    console.error('场景加载失败:', error);
    showError('场景加载失败: ' + error.message);
    onModelLoaded();
  });
}

function loadCharacter() {
  console.log('开始加载人物模型...');
  const loader = new FBXLoader();
  loader.load(CONFIG.model.characterPath, function(object) {
    console.log('人物模型加载成功');
    characterModel = object;
    
    const box = new THREE.Box3().setFromObject(characterModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('人物模型尺寸:', size.x, size.y, size.z);
    
    const targetHeight = CONFIG.model.characterTargetHeight;
    const scale = targetHeight / size.y;
    console.log('缩放比例:', scale);
    characterModel.scale.set(scale, scale, scale);
    
    const newBox = new THREE.Box3().setFromObject(characterModel);
    const newSize = newBox.getSize(new THREE.Vector3());
    const newCenter = newBox.getCenter(new THREE.Vector3());
    
    characterModel.position.y = CONFIG.model.characterPosition.y;
    characterModel.position.x = CONFIG.model.characterPosition.x;
    characterModel.position.z = CONFIG.model.characterPosition.z;
    console.log('人物位置:', characterModel.position.x, characterModel.position.y, characterModel.position.z);
    
    characterModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(characterModel);
    setupFBXAnimations(characterModel);
    updateModelInfo();
    onModelLoaded();
  }, function(xhr) {
    console.log('人物加载进度:', Math.round(xhr.loaded / xhr.total * 100) + '%');
  }, function(error) {
    console.error('人物加载失败:', error);
    showError('人物加载失败: ' + error.message);
    onModelLoaded();
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
        
        object.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        if (characterModel) {
          scene.remove(characterModel);
          characterModel = null;
        }
        characterModel = object;
        
        scene.add(characterModel);
        setupFBXAnimations(characterModel);
        autoCenterCamera();
        updateModelInfo();
        
        hideLoading();
      } catch (e) {
        showError('FBX parse error: ' + e.message);
      }
    } else {
      const loader = new GLTFLoader();
      loader.parse(arrayBuffer, '', function(gltf) {
        try {
          const modelObj = gltf.scene;
          
          modelObj.traverse(function(child) {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          if (sceneModel) {
            scene.remove(sceneModel);
            sceneModel = null;
          }
          sceneModel = modelObj;
          
          scene.add(sceneModel);
          setupAnimations(gltf, sceneModel);
          autoCenterCamera();
          updateModelInfo();
          
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
  autoCenterCamera();
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
  mixers.forEach(function(m) { m.update(delta); });
  renderer.render(scene, camera);
}

function init() {
  console.log('开始初始化...');
  initScene();
  console.log('场景初始化完成');
  initLights();
  console.log('灯光初始化完成');
  initGround();
  console.log('地面初始化完成');
  initUI();
  console.log('UI 初始化完成');
  renderLoop();
  console.log('渲染循环启动');
  loadScene();
  console.log('开始加载场景模型');
  loadCharacter();
  console.log('开始加载人物模型');
}

init();
