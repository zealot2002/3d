import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CONFIG } from './config.js?v=5';

let scene, camera, renderer, controls;
let sceneModel = null;
let characterModel = null;
let cakeModel = null;
let carModel = null;
let catModel = null;
let porscheModel = null;
let helicopterModel = null;
let mixers = [];
let clock = new THREE.Clock();
let loadedCount = 0;

// ===== 进度追踪系统 =====
const MODEL_META = {
  scene:      { name: '场景模型',     size: 9542041 },
  character:  { name: '人物模型',     size: 31876710 },
  cake:       { name: '生日蛋糕',     size: 1258291 },
  car:        { name: '跑车模型',     size: 6606028 },
  cat:        { name: '猫咪模型',     size: 6920601 },
  porsche:    { name: '保时捷911',    size: 22124953 },
  helicopter: { name: '阿帕奇直升机', size: 3565158 }
};

const progressState = {
  models: {},       // {key: {loaded, total, done}}
  totalModels: 7,
  getTotalLoaded() {
    return Object.values(this.models).reduce((s, m) => s + m.loaded, 0);
  },
  getTotalSize() {
    return Object.values(this.models).reduce((s, m) => s + (m.total > 0 ? m.total : 0), 0);
  },
  getPercent() {
    const size = this.getTotalSize();
    if (size === 0) return 0;
    return Math.min(99, Math.round(this.getTotalLoaded() / size * 100));
  },
  getDoneCount() {
    return Object.values(this.models).filter(m => m.done).length;
  }
};

function registerModelProgress(key) {
  progressState.models[key] = {
    loaded: 0,
    total: MODEL_META[key].size,
    done: false
  };
}

function createProgressHandler(key) {
  return function(xhr) {
    const m = progressState.models[key];
    if (!m) return;
    if (xhr.total > 0) m.total = xhr.total;  // 用真实 Content-Length 覆盖估算值
    m.loaded = xhr.loaded;
    updateProgressUI(key);
  };
}

function updateProgressUI(currentKey) {
  const pct = progressState.getPercent();
  const done = progressState.getDoneCount();
  
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const detail = document.getElementById('loading-detail');
  const models = document.getElementById('loading-models');
  
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = pct + '%';
  
  if (currentKey && progressState.models[currentKey] && !progressState.models[currentKey].done) {
    const m = progressState.models[currentKey];
    const mbLoaded = (m.loaded / 1048576).toFixed(1);
    const mbTotal = m.total > 0 ? (m.total / 1048576).toFixed(1) : '?';
    if (detail) detail.textContent = '正在加载: ' + MODEL_META[currentKey].name + ' (' + mbLoaded + '/' + mbTotal + ' MB)';
  }
  
  if (models) models.textContent = '已完成 ' + done + '/' + progressState.totalModels + ' 个模型';
}

function finishModelProgress(key) {
  const m = progressState.models[key];
  if (!m) return;
  m.loaded = m.total;
  m.done = true;
  updateProgressUI(key);
}
// ===== 进度追踪系统结束 =====

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
    if (characterModel) info += '人物已加载 ';
    if (cakeModel) info += '蛋糕已加载';
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
  if (cakeModel) box.expandByObject(cakeModel);
  if (carModel) box.expandByObject(carModel);
  if (catModel) box.expandByObject(catModel);
  if (porscheModel) box.expandByObject(porscheModel);
  if (helicopterModel) box.expandByObject(helicopterModel);
  
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

function onModelLoaded(key) {
  loadedCount++;
  console.log('已加载模型数量:', loadedCount, '(' + MODEL_META[key].name + ')');
  finishModelProgress(key);
  autoCenterCamera();
  
  if (loadedCount >= 7) {
    // 全部加载完成，短暂显示 100% 后隐藏
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    const detail = document.getElementById('loading-detail');
    const models = document.getElementById('loading-models');
    if (fill) fill.style.width = '100%';
    if (text) text.textContent = '100%';
    if (detail) detail.textContent = '加载完成！';
    if (models) models.textContent = '全部 7 个模型已就绪';
    
    setTimeout(hideLoading, 400);
  } else {
    console.log('等待其他模型加载...');
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
  const key = 'scene';
  registerModelProgress(key);
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
    onModelLoaded(key);
  }, createProgressHandler(key), function(error) {
    console.error('场景加载失败:', error);
    showError('场景加载失败: ' + error.message);
    onModelLoaded(key);
  });
}

function loadCharacter() {
  console.log('开始加载人物模型...');
  const key = 'character';
  registerModelProgress(key);
  const loader = new FBXLoader();
  const loadPath = CONFIG.model.characterUrl || CONFIG.model.characterPath;
  console.log('人物模型加载路径:', loadPath);
  loader.load(loadPath, function(object) {
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
    onModelLoaded(key);
  }, createProgressHandler(key), function(error) {
    console.error('人物加载失败:', error);
    showError('人物加载失败: ' + error.message);
    onModelLoaded(key);
  });
}

function loadCake() {
  console.log('========== 蛋糕加载开始 ==========');
  console.log('蛋糕配置路径:', CONFIG.model.cakePath);
  console.log('蛋糕配置缩放:', CONFIG.model.cakeScale);
  console.log('蛋糕配置位置:', CONFIG.model.cakePosition);
  
  const key = 'cake';
  registerModelProgress(key);
  const loader = new GLTFLoader();
  loader.load(CONFIG.model.cakePath, function(gltf) {
    console.log('========== 蛋糕加载成功 ==========');
    cakeModel = gltf.scene;
    
    console.log('gltf对象结构:', Object.keys(gltf));
    console.log('scene子对象数量:', cakeModel.children.length);
    
    cakeModel.traverse(function(child, index) {
      console.log('蛋糕子对象[' + index + ']:', child.name, '类型:', child.type, '可见:', child.visible);
    });
    
    const box = new THREE.Box3().setFromObject(cakeModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('蛋糕模型原始尺寸:', size.x, size.y, size.z);
    console.log('蛋糕模型边界中心:', box.getCenter(new THREE.Vector3()));
    
    const scale = CONFIG.model.cakeScale;
    console.log('应用缩放比例:', scale);
    cakeModel.scale.set(scale, scale, scale);
    
    const scaledBox = new THREE.Box3().setFromObject(cakeModel);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    console.log('缩放后尺寸:', scaledSize.x, scaledSize.y, scaledSize.z);
    
    cakeModel.position.x = CONFIG.model.cakePosition.x;
    cakeModel.position.y = CONFIG.model.cakePosition.y;
    cakeModel.position.z = CONFIG.model.cakePosition.z;
    console.log('蛋糕位置:', cakeModel.position.x, cakeModel.position.y, cakeModel.position.z);
    
    cakeModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        console.log('设置阴影:', child.name);
      }
    });
    
    console.log('添加到场景前，场景子对象数量:', scene.children.length);
    scene.add(cakeModel);
    console.log('添加到场景后，场景子对象数量:', scene.children.length);
    
    setupAnimations(gltf, cakeModel);
    updateModelInfo();
    onModelLoaded(key);
    
    console.log('========== 蛋糕加载完成 ==========');
  }, createProgressHandler(key), function(error) {
    console.error('========== 蛋糕加载失败 ==========');
    console.error('错误详情:', error);
    console.error('错误信息:', error.message);
    showError('蛋糕加载失败: ' + error.message);
    onModelLoaded(key);
  });
}

function loadCar() {
  console.log('========== 跑车加载开始 ==========');
  console.log('跑车配置路径:', CONFIG.model.carPath);
  console.log('跑车配置缩放:', CONFIG.model.carScale);
  console.log('跑车配置位置:', CONFIG.model.carPosition);
  
  const key = 'car';
  registerModelProgress(key);
  const loader = new GLTFLoader();
  loader.load(CONFIG.model.carPath, function(gltf) {
    console.log('========== 跑车加载成功 ==========');
    carModel = gltf.scene;
    
    console.log('scene子对象数量:', carModel.children.length);
    
    carModel.traverse(function(child, index) {
      console.log('跑车子对象[' + index + ']:', child.name, '类型:', child.type, '可见:', child.visible);
    });
    
    const box = new THREE.Box3().setFromObject(carModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('跑车模型原始尺寸:', size.x, size.y, size.z);
    
    const scale = CONFIG.model.carScale;
    console.log('应用缩放比例:', scale);
    carModel.scale.set(scale, scale, scale);
    
    const scaledBox = new THREE.Box3().setFromObject(carModel);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    console.log('缩放后尺寸:', scaledSize.x, scaledSize.y, scaledSize.z);
    
    carModel.position.x = CONFIG.model.carPosition.x;
    carModel.position.y = CONFIG.model.carPosition.y;
    carModel.position.z = CONFIG.model.carPosition.z;
    console.log('跑车位置:', carModel.position.x, carModel.position.y, carModel.position.z);
    
    carModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(carModel);
    setupAnimations(gltf, carModel);
    updateModelInfo();
    onModelLoaded(key);
    
    console.log('========== 跑车加载完成 ==========');
  }, createProgressHandler(key), function(error) {
    console.error('========== 跑车加载失败 ==========');
    console.error('错误详情:', error);
    console.error('错误信息:', error.message);
    showError('跑车加载失败: ' + error.message);
    onModelLoaded(key);
  });
}

function loadCat() {
  console.log('========== 猫咪加载开始 ==========');
  console.log('猫咪配置路径:', CONFIG.model.catPath);
  console.log('猫咪配置缩放:', CONFIG.model.catScale);
  console.log('猫咪配置位置:', CONFIG.model.catPosition);
  console.log('猫咪配置旋转:', CONFIG.model.catRotation);
  
  const key = 'cat';
  registerModelProgress(key);
  const loader = new GLTFLoader();
  loader.load(CONFIG.model.catPath, function(gltf) {
    console.log('========== 猫咪加载成功 ==========');
    catModel = gltf.scene;
    
    console.log('scene子对象数量:', catModel.children.length);
    
    catModel.traverse(function(child, index) {
      console.log('猫咪子对象[' + index + ']:', child.name, '类型:', child.type, '可见:', child.visible);
    });
    
    const box = new THREE.Box3().setFromObject(catModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('猫咪模型原始尺寸:', size.x, size.y, size.z);
    
    const scale = CONFIG.model.catScale;
    console.log('应用缩放比例:', scale);
    catModel.scale.set(scale, scale, scale);
    
    const scaledBox = new THREE.Box3().setFromObject(catModel);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    console.log('缩放后尺寸:', scaledSize.x, scaledSize.y, scaledSize.z);
    
    catModel.position.x = CONFIG.model.catPosition.x;
    catModel.position.y = CONFIG.model.catPosition.y;
    catModel.position.z = CONFIG.model.catPosition.z;
    console.log('猫咪位置:', catModel.position.x, catModel.position.y, catModel.position.z);
    
    catModel.rotation.x = CONFIG.model.catRotation.x;
    catModel.rotation.y = CONFIG.model.catRotation.y;
    catModel.rotation.z = CONFIG.model.catRotation.z;
    console.log('猫咪旋转:', catModel.rotation.x, catModel.rotation.y, catModel.rotation.z);
    
    catModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(catModel);
    setupAnimations(gltf, catModel);
    updateModelInfo();
    onModelLoaded(key);
    
    console.log('========== 猫咪加载完成 ==========');
  }, createProgressHandler(key), function(error) {
    console.error('========== 猫咪加载失败 ==========');
    console.error('错误详情:', error);
    console.error('错误信息:', error.message);
    showError('猫咪加载失败: ' + error.message);
    onModelLoaded(key);
  });
}

function loadPorsche() {
  console.log('========== 保时捷911加载开始 ==========');
  console.log('保时捷配置路径:', CONFIG.model.porschePath);
  console.log('保时捷配置缩放:', CONFIG.model.porscheScale);
  console.log('保时捷配置位置:', CONFIG.model.porschePosition);
  console.log('保时捷配置旋转:', CONFIG.model.porscheRotation);
  
  const key = 'porsche';
  registerModelProgress(key);
  const loader = new GLTFLoader();
  loader.load(CONFIG.model.porschePath, function(gltf) {
    console.log('========== 保时捷911加载成功 ==========');
    porscheModel = gltf.scene;
    
    const box = new THREE.Box3().setFromObject(porscheModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('保时捷原始尺寸:', size.x, size.y, size.z);
    
    const scale = CONFIG.model.porscheScale;
    console.log('应用缩放比例:', scale);
    porscheModel.scale.set(scale, scale, scale);
    
    porscheModel.position.x = CONFIG.model.porschePosition.x;
    porscheModel.position.y = CONFIG.model.porschePosition.y;
    porscheModel.position.z = CONFIG.model.porschePosition.z;
    console.log('保时捷位置:', porscheModel.position.x, porscheModel.position.y, porscheModel.position.z);
    
    porscheModel.rotation.x = CONFIG.model.porscheRotation.x;
    porscheModel.rotation.y = CONFIG.model.porscheRotation.y;
    porscheModel.rotation.z = CONFIG.model.porscheRotation.z;
    console.log('保时捷旋转:', porscheModel.rotation.x, porscheModel.rotation.y, porscheModel.rotation.z);
    
    porscheModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(porscheModel);
    setupAnimations(gltf, porscheModel);
    updateModelInfo();
    onModelLoaded(key);
    
    console.log('========== 保时捷911加载完成 ==========');
  }, createProgressHandler(key), function(error) {
    console.error('========== 保时捷911加载失败 ==========');
    console.error('错误详情:', error);
    showError('保时捷911加载失败: ' + error.message);
    onModelLoaded(key);
  });
}

function loadHelicopter() {
  console.log('========== 阿帕奇直升机加载开始 ==========');
  console.log('直升机配置路径:', CONFIG.model.helicopterPath);
  console.log('直升机配置缩放:', CONFIG.model.helicopterScale);
  console.log('直升机配置位置:', CONFIG.model.helicopterPosition);
  console.log('直升机配置旋转:', CONFIG.model.helicopterRotation);
  
  const key = 'helicopter';
  registerModelProgress(key);
  const loader = new GLTFLoader();
  loader.load(CONFIG.model.helicopterPath, function(gltf) {
    console.log('========== 阿帕奇直升机加载成功 ==========');
    helicopterModel = gltf.scene;
    
    const box = new THREE.Box3().setFromObject(helicopterModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('直升机原始尺寸:', size.x, size.y, size.z);
    
    const scale = CONFIG.model.helicopterScale;
    console.log('应用缩放比例:', scale);
    helicopterModel.scale.set(scale, scale, scale);
    
    helicopterModel.position.x = CONFIG.model.helicopterPosition.x;
    helicopterModel.position.y = CONFIG.model.helicopterPosition.y;
    helicopterModel.position.z = CONFIG.model.helicopterPosition.z;
    console.log('直升机位置:', helicopterModel.position.x, helicopterModel.position.y, helicopterModel.position.z);
    
    helicopterModel.rotation.x = CONFIG.model.helicopterRotation.x;
    helicopterModel.rotation.y = CONFIG.model.helicopterRotation.y;
    helicopterModel.rotation.z = CONFIG.model.helicopterRotation.z;
    console.log('直升机旋转:', helicopterModel.rotation.x, helicopterModel.rotation.y, helicopterModel.rotation.z);
    
    helicopterModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(helicopterModel);
    setupAnimations(gltf, helicopterModel);
    updateModelInfo();
    onModelLoaded(key);
    
    console.log('========== 阿帕奇直升机加载完成 ==========');
  }, createProgressHandler(key), function(error) {
    console.error('========== 阿帕奇直升机加载失败 ==========');
    console.error('错误详情:', error);
    showError('阿帕奇直升机加载失败: ' + error.message);
    onModelLoaded(key);
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
  loadCake();
  console.log('开始加载生日蛋糕模型');
  loadCar();
  console.log('开始加载跑车模型');
  loadCat();
  console.log('开始加载猫咪模型');
  loadPorsche();
  console.log('开始加载保时捷911模型');
  loadHelicopter();
  console.log('开始加载阿帕奇直升机模型');
}

init();
