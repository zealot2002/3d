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
    characterPath: 'models/pp1.fbx',     // 人物模型文件路径（本地开发）
    characterUrl: '',                    // 人物模型外部URL（部署时使用，如R2链接）
    characterTargetHeight: 2,            // 人物缩放后的目标高度（单位：米）
    characterPosition: { x: -2, y: 0, z: -1 },  // 人物在场景中的位置偏移
    
    cakePath: 'models/birthday_cake.glb',     // 生日蛋糕模型文件路径
    cakeScale: 1.0,                           // 蛋糕缩放倍数
    cakePosition: { x: -2.5, y: 0.35, z: -3.6 },  // 蛋糕在长椅上的位置
    
    carPath: 'models/2018_toyota_gr_super_sport_concept.glb',  // 跑车模型文件路径
    carScale: 1,                                                // 跑车缩放倍数
    carPosition: { x: -8, y: 0.15, z: -2 },                     // 跑车在院子里的位置
    carRotation: { x: 0, y: Math.PI, z: 0 },                    // 跑车旋转角度（绕Y轴转180度）
    
    catPath: 'models/sitting_catbritish_shorthair_blue_cat.glb',  // 猫咪模型文件路径
    catScale: 0.5,                                                // 猫咪缩放倍数
    catPosition: { x: -5, y: 0.05, z: -4.2 },                       // 猫咪在院子里的位置
    catRotation: { x: 0, y: 0, z: 0 },                           // 猫咪旋转角度
    
    porschePath: 'models/free_porsche_911_carrera_4s.glb',  // 保时捷911模型文件路径
    porscheScale: 1.0,                                       // 保时捷911缩放倍数
    porschePosition: { x: 3.2, y: 0.65, z: -2 },              // 保时捷911在院子里的位置
    porscheRotation: { x: 0, y: 0, z: 0 },        // 保时捷911旋转角度（45度）
    
    helicopterPath: 'models/boeing_ah-64d_apache_combat_helicopter.glb',  // 阿帕奇直升机模型文件路径
    helicopterScale: 4.2,                                                  // 阿帕奇直升机缩放倍数
    helicopterPosition: { x: 0, y: 6, z: -5 },                            // 阿帕奇直升机在空中的位置
    helicopterRotation: { x: 0, y: Math.PI, z: 0 }                        // 阿帕奇直升机旋转角度
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
