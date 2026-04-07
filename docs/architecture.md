# 技术博客系统 — 架构设计文档

## 1. 系统概述

本系统是一个高性能、可扩展的技术博客平台，采用前后端分离架构，支持 Markdown 写作、全文搜索、评论互动、用户权限管理等核心功能。

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | React 18 + Vite 5 | SPA 单页应用，快速热更新 |
| UI 样式 | TailwindCSS 3 | 原子化 CSS，极速开发 |
| 路由 | React Router v6 | 声明式路由，支持嵌套布局 |
| HTTP 客户端 | Axios | 请求拦截、统一错误处理 |
| 后端框架 | Express 4 (Node.js) | 轻量高性能 HTTP 服务 |
| 数据库 | MongoDB (Mongoose 8) | 文档型数据库，灵活 Schema |
| 缓存 | Redis (ioredis) | 热数据缓存，降低数据库压力 |
| 认证 | JWT (jsonwebtoken) | 无状态令牌认证 |
| 测试 | Jest + Supertest | 单元测试 + 集成测试 |

## 3. 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                    客户端 (React SPA)                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
│  │ 首页 │ │ 文章 │ │ 编辑 │ │ 搜索 │ │ 管理后台 │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘  │
│              ↓ Axios HTTP (JWT Bearer)               │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              API 网关层 (Express)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 中间件链:                                     │   │
│  │  Helmet → CORS → RateLimit → XSS → HPP →    │   │
│  │  Compression → JSON Parser → Morgan          │   │
│  └──────────────────────────────────────────────┘   │
│              ↓                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ 路由层:                                       │   │
│  │  /api/auth     → 认证控制器                    │   │
│  │  /api/articles → 文章控制器                    │   │
│  │  /api/comments → 评论控制器                    │   │
│  │  /api/search   → 搜索控制器                    │   │
│  └──────────────────────────────────────────────┘   │
│              ↓                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ 业务逻辑层 (Controllers)                      │   │
│  │  权限校验 → 数据验证 → 业务处理 → 缓存策略     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐   ┌──────────────────┐
│  MongoDB         │   │  Redis           │
│  ├─ users        │   │  ├─ articles:*   │
│  ├─ articles     │   │  ├─ article:slug │
│  └─ comments     │   │  ├─ tags         │
│                  │   │  ├─ search:*     │
│  全文索引:        │   │  └─ suggest:*    │
│  title+content   │   │                  │
│  +tags           │   │  TTL: 30-600s    │
└──────────────────┘   └──────────────────┘
```

## 4. 模块职责

### 4.1 认证模块 (`/api/auth`)
- **注册**: 用户名/邮箱唯一性校验 → bcrypt 密码加密 → 生成 JWT
- **登录**: 邮箱查询 → 密码比对 → 生成 JWT → 返回用户信息
- **鉴权中间件**: 从 Header 提取 Bearer Token → JWT 验证 → 用户查询 → 注入 `req.user`
- **角色授权**: 支持 `admin` / `user` 两种角色，中间件链式校验

### 4.2 文章模块 (`/api/articles`)
- **CRUD**: 创建/读取/更新/删除，权限控制（仅作者或管理员）
- **自动 Slug**: 基于标题生成 URL 友好的 slug
- **自动摘要**: 从 Markdown 内容提取前 200 字符
- **分页排序**: 支持按时间、浏览量、点赞数排序
- **标签/分类筛选**: 支持多维度组合筛选
- **点赞**: Toggle 机制，防止重复点赞

### 4.3 评论模块 (`/api/comments`)
- **嵌套回复**: `parentComment` 字段实现两级评论树
- **软删除**: `isDeleted` 标记，保留评论结构
- **评论计数**: 通过 post-save hook 自动更新文章的评论数

### 4.4 搜索模块 (`/api/search`)
- **全文搜索**: MongoDB `$text` 索引，支持标题+内容+标签搜索
- **搜索建议**: 正则匹配，返回前 8 条建议
- **结果缓存**: Redis 缓存 30 秒，减少重复查询

## 5. 数据库设计

### User 集合
| 字段 | 类型 | 说明 |
|------|------|------|
| username | String | 唯一，2-30字符 |
| email | String | 唯一，小写 |
| password | String | bcrypt 加密，select: false |
| role | String | admin / user |
| avatar | String | 头像 URL |
| bio | String | 个人简介，200字符上限 |
| isActive | Boolean | 账户启用状态 |

### Article 集合
| 字段 | 类型 | 说明 |
|------|------|------|
| title | String | 必填，120字符上限 |
| slug | String | 唯一索引，URL 标识 |
| content | String | Markdown 正文 |
| excerpt | String | 自动/手动摘要 |
| author | ObjectId → User | 作者引用 |
| tags | [String] | 标签数组 |
| category | String | 分类 |
| status | String | draft / published / archived |
| viewCount | Number | 浏览量 |
| likes | [ObjectId] | 点赞用户列表 |
| likeCount | Number | 冗余计数 |
| commentCount | Number | 冗余计数 |
| isTop | Boolean | 置顶标记 |

**索引策略**:
- `{ title: 'text', content: 'text', tags: 'text' }` — 全文搜索
- `{ status: 1, createdAt: -1 }` — 列表查询
- `{ author: 1, status: 1 }` — 用户文章
- `{ tags: 1, status: 1 }` — 标签筛选

### Comment 集合
| 字段 | 类型 | 说明 |
|------|------|------|
| content | String | 评论内容，1000字符上限 |
| author | ObjectId → User | 评论者 |
| article | ObjectId → Article | 所属文章 |
| parentComment | ObjectId → Comment | 父评论（null=顶级） |
| likes | [ObjectId] | 点赞用户 |
| likeCount | Number | 冗余计数 |
| isDeleted | Boolean | 软删除标记 |

## 6. 缓存策略

| 缓存键 | TTL | 触发清除 |
|--------|-----|---------|
| `articles:{query}` | 60s | 文章增删改 |
| `article:{slug}` | 300s | 文章更新/删除 |
| `tags` | 600s | 文章增删 |
| `search:{query}` | 30s | 自然过期 |
| `suggest:{q}` | 60s | 自然过期 |

Redis 采用**降级策略**：若 Redis 不可用，系统自动回退到直接查询数据库。

## 7. 安全措施

| 威胁 | 防护措施 |
|------|---------|
| XSS | 请求体自动转义特殊字符 |
| SQL/NoSQL 注入 | Mongoose 参数化查询 + express-validator |
| CSRF | JWT 无状态认证，无 Cookie 依赖 |
| 暴力破解 | express-rate-limit（登录 15分钟/10次） |
| HTTP 头攻击 | Helmet 安全头加固 |
| 参数污染 | hpp 中间件 |
| 敏感信息泄露 | 密码字段 `select: false`，生产环境隐藏错误栈 |

## 8. 性能优化

- **响应压缩**: `compression` 中间件，gzip 压缩
- **数据库连接池**: Mongoose `maxPoolSize: 10`
- **全文索引**: MongoDB text index，避免全表扫描
- **冗余计数字段**: `likeCount`/`commentCount` 避免聚合查询
- **Redis 缓存**: 热数据缓存，降低 DB 读负载
- **前端代码分割**: Vite 自动 Tree-shaking + 懒加载
- **查询投影**: `.lean()` 返回 POJO，减少 Mongoose 开销
