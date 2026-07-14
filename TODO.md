# 篮球赛事数据直播系统 - 开发任务清单

## Milestone 1: 基础架构（第1周）✅
- [x] 项目初始化（前后端脚手架）
- [x] 数据库建表与连接
- [x] 搭建Express服务，基础路由
- [x] 实现球队、球员、比赛的CRUD API
- [x] 前端管理后台页面（赛事管理）

## Milestone 2: 实时通信核心（第2周）✅
- [x] 集成WebSocket（Socket.IO）
- [x] 实现 join-match 房间订阅
- [x] 实现 record-event 和 cancel-event 后端逻辑
- [x] 实现Redis缓存更新
- [x] 实现广播 match-update 和 player-stats-update
- [x] 前端操作端页面（球员列表、事件记录、事件列表）

## Milestone 3: 数据大屏（第3周）✅
- [x] 大屏页面布局设计
- [x] 接入WebSocket，实时刷新比分和统计
- [x] 球员排行组件（使用ECharts）
- [x] 事件滚动列表

## Milestone 4: 直播推流（第4周）✅
- [x] 对接第三方直播服务API（获取推拉流地址）
- [x] 在比赛详情页和操作端显示播放器（video.js）
- [x] 推流状态管理

## Milestone 5: 完善与测试（第5周）⬜
- [ ] 权限与登录（JWT）
- [ ] 错误处理与日志
- [ ] 性能优化（Redis缓存过期策略）
- [ ] 端到端测试（模拟一场完整比赛）

## 基础设施
- [x] Docker Compose 配置
- [x] 环境变量配置
- [x] README 文档
