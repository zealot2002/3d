export const CONFIG = {
  // ===== 相机配置 =====
  camera: {
    fov: 50,                         // 相机视野角度，单位度
    near: 0.1,                        // 近裁剪面距离
    far: 1000,                        // 远裁剪面距离
    initialPosition: { x: 5, y: 3, z: 5 },  // 模型加载前的初始位置
    minDistance: 1,                   // OrbitControls最小缩放距离
    maxDistance: 500,                 // OrbitControls最大缩放距离
    dampingFactor: 0.08,              // 阻尼系数，控制旋转平滑度
    autoCenterScale: 2,               // 自动居中时相机距离倍数，距离=模型最大尺寸×此值
    autoCenterDirection: { x: 1, y: 0.5, z: 1 }  // 相机相对于模型中心的方向
  },

  // ===== 灯光配置 =====
  lighting: {
    ambientColor: 0xffffff,           // 环境光颜色
    ambientIntensity: 0.8,            // 环境光强度
    sunColor: 0xfff5e6,               // 主方向光（太阳光）颜色
    sunIntensity: 1.5,                // 主方向光强度
    sunPosition: { x: 10, y: 15, z: 10 },  // 主方向光位置
    fillColor: 0xcce5ff,              // 补光颜色，减少阴影过暗
    fillIntensity: 0.5,               // 补光强度
    fillPosition: { x: -10, y: 8, z: -10 },  // 补光位置
    rimColor: 0x88ccff,               // 轮廓光颜色，增加立体感
    rimIntensity: 0.3,                // 轮廓光强度
    rimPosition: { x: 0, y: 5, z: 15 }  // 轮廓光位置
  },

  // ===== 模型配置 =====
  model: {
    scenePath: 'models/fairy_yard.glb',  // 场景模型文件路径
    characterPath: 'models/pp1.fbx',     // 人物模型文件路径
    characterTargetHeight: 2,            // 人物缩放后的目标高度（单位：米）
    characterPosition: { x: -2, y: 0, z: -1 }  // 人物在场景中的位置偏移
  },

  // ===== 渲染配置 =====
  rendering: {
    background: 0x1a1a2e,             // 场景背景颜色
    antialias: true,                  // 是否启用抗锯齿
    shadowMapSize: 2048               // 阴影贴图分辨率
  },

  // ===== 动画配置 =====
  animation: {
    loopMode: 2,                      // 动画循环模式：0=单次, 1=往返, 2=循环
    speed: 1.0                        // 动画播放速度
  },

  // ===== 地面配置 =====
  ground: {
    radius: 30,                       // 地面圆台半径
    color: 0x1a1a2e,                  // 地面颜色
    roughness: 0.9,                   // 地面粗糙度
    gridSize: 60,                     // 网格辅助线尺寸
    gridDivisions: 60                 // 网格辅助线分段数
  }
};
