# 3D 模型查看器

基于 Three.js 的 3D 模型查看器，支持自定义上传模型预览。

## 功能特性

- 📁 上传本地 GLB/GLTF/FBX 模型文件
- 🎬 自动播放模型动画
- 🖱️ 拖拽旋转、滚轮缩放、右键平移
- 🔄 重置视角

## 使用方法

### 本地运行

```bash
python3 -m http.server 8080
```

然后访问 http://localhost:8080

### 上传模型

1. 点击"上传模型"按钮
2. 选择本地 GLB/GLTF/FBX 文件
3. 模型自动加载并显示

## 技术栈

- Three.js 0.160.0
- HTML5 Canvas
- WebGL

## 支持的模型格式

- GLB (.glb)
- GLTF (.gltf)
- FBX (.fbx)