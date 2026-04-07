# 博客系统 × Discuz! Q 接入文档

## 概述

本博客系统前端已完成与 Discuz! Q 后台的对接。通过 API 适配层，将 Discuz! Q 的 JSON:API 格式数据无缝转换为博客前端所需格式，**前端页面组件无需任何修改**。

## 核心映射关系

| 博客概念 | Discuz! Q 对应 | 说明 |
|---------|---------------|------|
| 文章 (Article) | 帖子 (Thread) | 博客文章 = Discuz 帖子 |
| 评论 (Comment) | 回帖 (Post) | 博客评论 = Discuz 回帖 |
| 用户 (User) | 用户 (User) | 直接对应 |
| 分类 (Category) | 分类 (Category) | 直接对应 |
| 标签 (Tag) | 话题 (Topic) | 博客标签 = Discuz 话题 |
| 文章ID/Slug | Thread ID | Discuz 无 slug，用 ID 替代 |

## 前置条件

1. **已部署 Discuz! Q 服务器**（推荐 v3.0+）
2. Discuz! Q 后台已开启 **API 访问**
3. 已在 Discuz! Q 后台创建至少一个**分类**用于存放博客文章

## 快速配置

### 1. 创建环境变量文件

```bash
cd client
cp .env.example .env
```

### 2. 修改 `.env` 文件

```env
# Discuz! Q 服务器地址
VITE_DISCUZ_URL=http://your-discuz-domain.com

# 博客文章发布到的 Discuz 分类 ID
VITE_DISCUZ_CATEGORY_ID=1
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 跨域配置（重要）

如果前端和 Discuz! Q 不在同一域名下，需要在 Discuz! Q 后台配置 CORS：

- 进入 Discuz! Q 管理后台 → 全局设置 → 跨域设置
- 添加前端域名到允许列表（如 `http://localhost:5173`）

或在 Vite 中配置代理（开发环境）：

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://your-discuz-domain.com',
        changeOrigin: true,
      }
    }
  }
}
```

## 文件结构

```
client/src/api/
├── discuz-config.js      # Discuz! Q 配置（地址、分类、存储key）
├── discuz-client.js      # HTTP 客户端（axios 实例，自动 token）
├── discuz-transforms.js  # 数据转换层（JSON:API ↔ 博客格式）
└── index.js              # API 接口层（保持原有导出签名）
```

## API 适配详情

### 认证模块 (authAPI)

| 博客方法 | Discuz! Q 端点 | 说明 |
|---------|---------------|------|
| `login()` | `POST /api/login` | Discuz 用 username 登录 |
| `register()` | `POST /api/register` | 注册新用户 |
| `getMe()` | `GET /api/users/{id}` | 从本地缓存取 ID 后查询 |
| `updateProfile()` | `PATCH /api/users/{id}` | 更新用户名、签名、头像 |
| `changePassword()` | `PATCH /api/users/{id}` | 修改密码 |
| `getUsers()` | `GET /api/users` | 管理员获取用户列表 |
| `toggleUser()` | `PATCH /api/users/{id}` | 禁用/启用用户 |

### 文章模块 (articleAPI)

| 博客方法 | Discuz! Q 端点 | 说明 |
|---------|---------------|------|
| `getAll()` | `GET /api/threads` | 支持分页、排序、分类筛选 |
| `getBySlug()` | `GET /api/threads/{id}` | slug 实际为 thread ID |
| `getMine()` | `GET /api/threads?filter[userId]=` | 筛选当前用户 |
| `create()` | `POST /api/threads` | 创建帖子（长文类型） |
| `update()` | `PATCH /api/threads/{id}` | 更新帖子 |
| `delete()` | `DELETE /api/threads/{id}` | 删除帖子 |
| `toggleLike()` | `POST/DELETE /api/threads/{id}/favorites` | 收藏/取消收藏 |
| `getTags()` | `GET /api/topics` | 获取所有话题标签 |

### 评论模块 (commentAPI)

| 博客方法 | Discuz! Q 端点 | 说明 |
|---------|---------------|------|
| `getByArticle()` | `GET /api/posts?filter[thread]=` | 按帖子筛选回复 |
| `create()` | `POST /api/posts` | 支持楼中楼回复 |
| `delete()` | `DELETE /api/posts/{id}` | 删除回复 |
| `toggleLike()` | `POST/DELETE /api/posts/{id}/likes` | 点赞回复 |

### 搜索模块 (searchAPI)

| 博客方法 | Discuz! Q 端点 | 说明 |
|---------|---------------|------|
| `search()` | `GET /api/threads?filter[q]=` | 关键词搜索帖子 |
| `suggest()` | `GET /api/threads?filter[q]=` | 复用搜索取前5条 |

## 数据转换说明

### JSON:API 格式

Discuz! Q 使用 JSON:API 规范，响应格式为：

```json
{
  "data": {
    "type": "threads",
    "id": "123",
    "attributes": { "title": "文章标题", ... },
    "relationships": {
      "user": { "data": { "type": "users", "id": "1" } }
    }
  },
  "included": [
    { "type": "users", "id": "1", "attributes": { "username": "作者" } }
  ]
}
```

转换层会自动将其转为博客前端期望的扁平格式：

```json
{
  "_id": "123",
  "title": "文章标题",
  "author": { "_id": "1", "username": "作者" },
  ...
}
```

## 注意事项

1. **登录方式**：Discuz! Q 默认使用用户名登录，博客登录页的「邮箱」字段实际传递的是用户名
2. **文章内容**：Discuz! Q 中帖子正文存在第一条 post（firstPost）中，转换层已自动处理
3. **文章状态**：`isApproved=1` 对应已发布，`isApproved=0` 对应草稿
4. **管理员判断**：通过用户所属组（group_id=1 为管理员）判断
5. **点赞功能**：博客的「点赞」映射为 Discuz 的「收藏」(favorites)
6. **无 slug 概念**：文章 URL 中使用 Discuz thread ID 代替 slug

## 原有 Express 后端

接入 Discuz! Q 后，原有的 `server/` 目录（Express + MongoDB）不再需要运行。如果需要切换回原后端，只需将 `client/src/api/index.js` 恢复为原始版本即可。

原始版本已备份说明：原 `api/index.js` 使用 `/api` 前缀调用 Express 后端，现在改为调用 Discuz! Q API。
