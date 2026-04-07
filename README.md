# 技术博客系统

一个高性能、可扩展的全栈技术博客平台，采用前后端分离架构。

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 18 + Vite 5 + TailwindCSS 3 + React Router 6 |
| 后端 | Node.js + Express 4 |
| 数据库 | MongoDB (Mongoose 8) |
| 缓存 | Redis (ioredis) |
| 认证 | JWT |
| 测试 | Jest + Supertest |

## 功能特性

- ✅ JWT 用户认证（注册/登录/权限管理）
- ✅ 管理员/普通用户角色权限
- ✅ Markdown 文章编辑与实时预览
- ✅ 文章 CRUD（创建/读取/更新/删除）
- ✅ 评论系统（嵌套回复 + 点赞）
- ✅ 全文搜索（标题/内容/标签）
- ✅ Redis 缓存热数据
- ✅ 安全防护（XSS/CSRF/速率限制/Helmet）
- ✅ 响应式 UI 设计
- ✅ 管理后台（用户管理/文章管理）

## 快速开始

### 前置要求

- Node.js ≥ 18
- MongoDB ≥ 6
- Redis ≥ 7（可选，系统支持无缓存模式）

### 1. 克隆项目

```bash
cd blog-system
```

### 2. 配置环境变量

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填写数据库连接等信息
```

### 3. 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd ../client
npm install
```

### 4. 启动开发服务

```bash
# 终端 1 — 启动后端
cd server
npm run dev

# 终端 2 — 启动前端
cd client
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:5000/api
- 健康检查：http://localhost:5000/api/health

### 5. 运行测试

```bash
cd server
npm test
```

## 项目结构

```
blog-system/
├── client/                    # 前端 React 应用
│   ├── src/
│   │   ├── api/               # API 请求层
│   │   ├── components/        # 可复用组件
│   │   │   ├── Navbar.jsx     # 导航栏
│   │   │   ├── Layout.jsx     # 页面布局
│   │   │   ├── ArticleCard.jsx # 文章卡片
│   │   │   ├── CommentSection.jsx # 评论区
│   │   │   └── MarkdownEditor.jsx # MD编辑器
│   │   ├── context/           # React Context
│   │   │   └── AuthContext.jsx # 认证状态
│   │   ├── pages/             # 页面组件
│   │   │   ├── Home.jsx       # 首页
│   │   │   ├── Articles.jsx   # 文章列表
│   │   │   ├── ArticleDetail.jsx # 文章详情
│   │   │   ├── ArticleEditor.jsx # 文章编辑器
│   │   │   ├── SearchPage.jsx # 搜索页
│   │   │   ├── Login.jsx      # 登录
│   │   │   ├── Register.jsx   # 注册
│   │   │   ├── Profile.jsx    # 个人中心
│   │   │   ├── MyArticles.jsx # 我的文章
│   │   │   └── Admin.jsx      # 管理后台
│   │   ├── styles/            # 样式文件
│   │   ├── App.jsx            # 路由配置
│   │   └── main.jsx           # 入口文件
│   └── package.json
│
├── server/                    # 后端 Express 服务
│   ├── src/
│   │   ├── config/            # 配置
│   │   │   ├── db.js          # MongoDB 连接
│   │   │   └── redis.js       # Redis 客户端
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.js        # JWT 认证
│   │   │   ├── security.js    # 安全防护
│   │   │   └── errorHandler.js # 错误处理
│   │   ├── models/            # 数据模型
│   │   │   ├── User.js        # 用户模型
│   │   │   ├── Article.js     # 文章模型
│   │   │   └── Comment.js     # 评论模型
│   │   ├── controllers/       # 控制器
│   │   │   ├── authController.js
│   │   │   ├── articleController.js
│   │   │   ├── commentController.js
│   │   │   └── searchController.js
│   │   ├── routes/            # 路由
│   │   │   ├── auth.js
│   │   │   ├── articles.js
│   │   │   ├── comments.js
│   │   │   └── search.js
│   │   └── app.js             # 服务入口
│   ├── tests/                 # 测试文件
│   │   ├── auth.test.js       # 认证测试
│   │   ├── article.test.js    # 文章测试
│   │   └── comment.test.js    # 评论测试
│   ├── .env.example
│   └── package.json
│
├── docs/                      # 技术文档
│   ├── architecture.md        # 架构设计文档
│   └── api.md                 # API 接口文档
│
└── README.md
```

## 创建管理员账户

注册后，通过 MongoDB 手动提升权限：

```javascript
// MongoDB Shell
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

## 部署

### 生产环境构建

```bash
# 前端构建
cd client
npm run build
# 产物在 dist/ 目录

# 后端启动
cd server
NODE_ENV=production npm start
```

### 环境变量（生产）

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db/tech-blog
REDIS_HOST=your-redis-host
JWT_SECRET=your-secure-random-string
CLIENT_URL=https://your-domain.com
```

## 文档

- [架构设计文档](./docs/architecture.md) — 系统架构、模块职责、数据库设计、缓存策略、安全措施
- [API 接口文档](./docs/api.md) — 全部 REST API 接口详细说明

## 开源协议

MIT
