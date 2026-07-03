export const CONFIG = {
  camera: {
    fov: 50,
    near: 0.1,
    far: 1000,
    initialPosition: { x: 5, y: 3, z: 5 },
    minDistance: 1,
    maxDistance: 500,
    dampingFactor: 0.08,
    autoCenterScale: 2,
    autoCenterDirection: { x: 1, y: 0.5, z: 1 }
  },

  lighting: {
    ambientColor: 0xffffff,
    ambientIntensity: 0.8,
    sunColor: 0xfff5e6,
    sunIntensity: 1.5,
    sunPosition: { x: 10, y: 15, z: 10 },
    fillColor: 0xcce5ff,
    fillIntensity: 0.5,
    fillPosition: { x: -10, y: 8, z: -10 },
    rimColor: 0x88ccff,
    rimIntensity: 0.3,
    rimPosition: { x: 0, y: 5, z: 15 }
  },

  model: {
    scenePath: 'models/fairy_yard.glb',
    characterPath: 'models/pp1.fbx',
    characterTargetHeight: 2,
    characterPosition: { x: -2, y: 0, z: -1 }
  },

  rendering: {
    background: 0x1a1a2e,
    antialias: true,
    shadowMapSize: 2048
  },

  animation: {
    loopMode: 2,
    speed: 1.0
  },

  ground: {
    radius: 30,
    color: 0x1a1a2e,
    roughness: 0.9,
    gridSize: 60,
    gridDivisions: 60
  }
};
