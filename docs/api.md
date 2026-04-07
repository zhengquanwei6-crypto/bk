# 技术博客系统 — API 接口文档

**Base URL**: `http://localhost:5000/api`

**认证方式**: Bearer Token（在 Header 中添加 `Authorization: Bearer <token>`）

---

## 1. 认证接口 `/api/auth`

### 1.1 注册
```
POST /api/auth/register
```
**请求体**:
```json
{
  "username": "用户名 (2-30字符)",
  "email": "邮箱",
  "password": "密码 (≥6字符)"
}
```
**成功响应** `201`:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "jwt_token",
    "user": { "id", "username", "email", "role", "avatar" }
  }
}
```

### 1.2 登录
```
POST /api/auth/login
```
**请求体**:
```json
{ "email": "邮箱", "password": "密码" }
```
**成功响应** `200`: 同注册响应格式

### 1.3 获取当前用户
```
GET /api/auth/me
🔒 需登录
```

### 1.4 更新个人信息
```
PUT /api/auth/profile
🔒 需登录
```
**请求体**: `{ "username?", "bio?", "avatar?" }`

### 1.5 修改密码
```
PUT /api/auth/password
🔒 需登录
```
**请求体**: `{ "currentPassword", "newPassword" }`

### 1.6 获取用户列表
```
GET /api/auth/users?page=1&limit=20
🔒 管理员
```

### 1.7 切换用户状态
```
PUT /api/auth/users/:id/toggle
🔒 管理员
```

---

## 2. 文章接口 `/api/articles`

### 2.1 获取文章列表
```
GET /api/articles?page=1&limit=10&sort=latest&tag=JavaScript&category=前端开发&author=userId
```
**排序选项**: `latest` | `popular` | `mostLiked`

**成功响应** `200`:
```json
{
  "success": true,
  "data": [{ "文章对象" }],
  "pagination": { "page", "limit", "total", "pages" }
}
```

### 2.2 获取单篇文章
```
GET /api/articles/:slug
```
自动递增浏览量

### 2.3 创建文章
```
POST /api/articles
🔒 需登录
```
**请求体**:
```json
{
  "title": "标题 (必填, ≤120字符)",
  "content": "Markdown 内容 (必填)",
  "excerpt?": "摘要 (留空自动生成)",
  "coverImage?": "封面图片 URL",
  "tags?": ["标签数组"],
  "category?": "分类",
  "status?": "draft | published"
}
```

### 2.4 更新文章
```
PUT /api/articles/:id
🔒 作者或管理员
```
**可更新字段**: `title`, `content`, `excerpt`, `coverImage`, `tags`, `category`, `status`, `isTop`

### 2.5 删除文章
```
DELETE /api/articles/:id
🔒 作者或管理员
```

### 2.6 点赞/取消点赞
```
PUT /api/articles/:id/like
🔒 需登录
```
**响应**: `{ "likeCount", "isLiked" }`

### 2.7 获取当前用户文章
```
GET /api/articles/my/list?status=draft&page=1
🔒 需登录
```

### 2.8 获取所有标签
```
GET /api/articles/meta/tags
```
**响应**: `[{ "_id": "标签名", "count": 数量 }]`

---

## 3. 评论接口 `/api/comments`

### 3.1 获取文章评论
```
GET /api/comments/article/:articleId?page=1&limit=20
```
返回顶级评论（含嵌套回复），按时间倒序

### 3.2 创建评论
```
POST /api/comments
🔒 需登录
```
**请求体**:
```json
{
  "content": "评论内容 (1-1000字符)",
  "articleId": "文章ID",
  "parentCommentId?": "父评论ID (回复时)"
}
```

### 3.3 删除评论
```
DELETE /api/comments/:id
🔒 作者或管理员
```
软删除，内容替换为"该评论已被删除"

### 3.4 点赞评论
```
PUT /api/comments/:id/like
🔒 需登录
```

---

## 4. 搜索接口 `/api/search`

### 4.1 全文搜索
```
GET /api/search?q=关键词&tag=标签&category=分类&page=1&limit=10
```
基于 MongoDB 全文索引，支持标题+内容+标签搜索

### 4.2 搜索建议
```
GET /api/search/suggest?q=关键词
```
输入 ≥2 字符触发，返回前 8 条匹配文章

---

## 5. 健康检查
```
GET /api/health
```
**响应**: `{ "success": true, "message": "服务运行正常", "timestamp" }`

---

## 6. 错误响应格式

所有错误统一返回：
```json
{
  "success": false,
  "message": "错误描述（中文）"
}
```

**常见状态码**:
| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 / 验证失败 |
| 401 | 未认证 / Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 7. 速率限制

| 接口范围 | 限制 |
|---------|------|
| 全局 | 每 IP 15分钟 100 次 |
| 认证接口 | 每 IP 15分钟 10 次 |
