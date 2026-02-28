# 🐍 贪吃蛇大作战 (Snake Battle)

一款多平台贪吃蛇游戏，支持微信小程序、Web、Steam等多平台发布。

## 技术栈
- **游戏引擎**: Cocos Creator 3.8 (跨平台支持)
- **开发语言**: TypeScript
- **目标平台**: 
  - 微信小程序/小游戏
  - Web (H5)
  - Steam (Electron)
  - iOS/Android

## 核心功能
- 🎮 经典贪吃蛇玩法 + 创新模式
- 🏆 排行榜系统
- 💰 内购/广告变现
- 🌐 多人在线对战
- 🎨 皮肤系统
- 📊 数据统计

## 项目结构
```
snake-game/
├── src/           # 游戏源码
│   ├── game/      # 核心游戏逻辑
│   ├── ui/        # UI组件
│   ├── utils/     # 工具函数
│   ├── config/    # 配置文件
│   └── network/   # 网络模块
├── assets/        # 资源文件
├── scripts/       # 构建脚本
├── docs/          # 文档
└── .agent-cluster/ # AI Agent集群配置
```

## Agent 集群开发
本项目使用 OpenClaw + AI Agent 集群系统进行开发管理。
