# 🏀 篮球赛事数据直播系统

一个类似"我奥篮球"的篮球赛事数据管理平台，支持实时数据记录、直播推流与数据大屏展示。

## 功能特性

- **赛事管理** — 创建比赛、管理球队和球员
- **实时数据记录** — 操作端实时记录得分、助攻、篮板、抢断、盖帽等事件
- **直播推流** — 支持 HLS/FLV 直播播放，集成 video.js
- **数据大屏** — 炫酷全屏数据展示，实时刷新比分和球员统计
- **WebSocket 实时同步** — 操作端、大屏端、管理后台数据毫秒级同步
- **数据撤销** — 支持事件撤销与自动更正统计数据

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + TypeScript + Ant Design |
| 后端 | Node.js + Express + TypeScript |
| 实时通信 | Socket.IO (WebSocket) |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 图表 | ECharts |
| 直播播放器 | Video.js + hls.js |
| 部署 | Docker + Nginx |

## 快速开始

### 方式一：Docker 一键启动（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd basketball-live-system

# 2. 启动所有服务
docker-compose up -d

# 3. 访问
# 管理后台: http://localhost
# 操作端: http://localhost/match/1/control
# 数据大屏: http://localhost/match/1/dashboard
```

### 方式二：本地开发

```bash
# 1. 安装依赖
npm run install:all

# 2. 启动 PostgreSQL 和 Redis
# 可以使用 Docker:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name pg postgres:16-alpine
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 3. 初始化数据库
cd backend && npx tsx src/database/migrate.ts

# 4. 填充示例数据（可选）
npx tsx src/database/seed.ts

# 5. 启动后端
npm run dev:backend

# 6. 启动前端（新终端）
npm run dev:frontend

# 7. 访问
# 管理后台: http://localhost:5173/admin/matches
# 操作端: http://localhost:5173/match/1/control
# 数据大屏: http://localhost:5173/match/1/dashboard
```

## 项目结构

```
basketball-live-system/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── database/           # 数据库连接与迁移
│   │   │   ├── pool.ts         # PostgreSQL 连接池
│   │   │   ├── migrate.ts      # 数据库迁移
│   │   │   └── seed.ts         # 示例数据填充
│   │   ├── routes/             # API 路由
│   │   │   ├── matches.ts      # 赛事管理路由
│   │   │   ├── teams.ts        # 球队/球员路由
│   │   │   └── events.ts       # 事件记录路由
│   │   ├── services/           # 业务逻辑
│   │   │   ├── matchService.ts # 赛事数据服务
│   │   │   ├── redisService.ts # Redis 连接
│   │   │   └── statsCacheService.ts # 统计缓存
│   │   └── index.ts            # 入口文件（Express + Socket.IO）
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/          # 管理后台
│   │   │   │   ├── Matches.tsx # 比赛管理
│   │   │   │   └── Teams.tsx   # 球队/球员管理
│   │   │   ├── Control/        # 操作端
│   │   │   │   └── ControlPanel.tsx
│   │   │   ├── Dashboard/      # 数据大屏
│   │   │   │   └── Dashboard.tsx
│   │   │   └── Match/          # 比赛详情（直播）
│   │   │       └── MatchDetail.tsx
│   │   ├── hooks/
│   │   │   └── useSocket.ts    # Socket.IO Hook
│   │   ├── utils/
│   │   │   ├── api.ts          # Axios 实例
│   │   │   └── socket.ts       # Socket.IO 实例
│   │   ├── App.tsx             # 路由配置
│   │   └── main.tsx            # 入口文件
│   ├── package.json
│   └── vite.config.ts
├── docker/                     # Docker 配置
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml          # Docker Compose 配置
├── package.json                # 根 package.json (monorepo)
└── README.md
```

## API 接口

所有接口前缀 `/api/v1`

### 赛事管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/matches` | 获取比赛列表 |
| POST | `/matches` | 创建比赛 |
| GET | `/matches/:id` | 获取比赛详情 |
| PUT | `/matches/:id` | 更新比赛 |
| DELETE | `/matches/:id` | 删除比赛 |
| POST | `/matches/:id/lineup` | 设置上场名单 |
| GET | `/matches/:id/lineup` | 获取上场名单 |

### 球队/球员

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/teams` | 球队列表 |
| POST | `/teams` | 创建球队 |
| GET | `/teams/:id/players` | 获取球队球员 |
| GET | `/players` | 所有球员 |
| POST | `/players` | 创建球员 |
| PUT | `/players/:id` | 更新球员 |

### 数据记录

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/matches/:id/events` | 记录事件 |
| DELETE | `/events/:eventId` | 撤销事件 |
| GET | `/matches/:id/stats` | 获取比赛统计 |
| GET | `/matches/:id/player-stats` | 获取球员统计 |
| GET | `/matches/:id/events` | 获取事件列表 |

### 直播推流

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/matches/:id/stream` | 获取播放地址 |
| POST | `/matches/:id/stream/generate` | 生成推流地址 |

## WebSocket 事件

### 客户端 → 服务端

- `join-match` — 加入比赛房间
- `record-event` — 记录事件
- `cancel-event` — 撤销事件

### 服务端 → 客户端

- `match-update` — 比赛数据更新
- `player-stats-update` — 球员统计更新
- `event-added` — 新事件通知
- `event-cancelled` — 事件取消通知

## 数据库表结构

```sql
teams          -- 球队表
players        -- 球员表
matches        -- 比赛表
match_players  -- 比赛-球员关联（上场名单）
play_events    -- 比赛事件表（核心）
```

详见 `backend/src/database/migrate.ts`

## 环境变量

复制 `backend/.env.example` 为 `backend/.env` 并修改配置：

```bash
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=basketball_live
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

## 开发里程碑

- ✅ **M1**: 基础架构 — 前后端脚手架、数据库、CRUD API
- ✅ **M2**: 实时通信 — Socket.IO、事件记录、Redis 缓存、操作端
- ✅ **M3**: 数据大屏 — 全屏展示、ECharts 图表、实时刷新
- ✅ **M4**: 直播推流 — video.js 播放器、推拉流地址管理
- ⬜ **M5**: 完善 — JWT 认证、错误处理、性能优化、端到端测试

## 许可证

MIT
