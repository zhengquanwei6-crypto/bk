import dzq from './discuz-client';
import { DEFAULT_CATEGORY_ID, DEFAULT_PAGE_SIZE, TOKEN_KEY, USER_KEY } from './discuz-config';
import {
  transformLoginResponse,
  transformUser,
  transformThread,
  transformThreadList,
  transformPostList,
  transformCategories,
  transformUserList,
  buildThreadBody,
  buildPostBody,
} from './discuz-transforms';

/**
 * 博客前端 API 层 —— Discuz! Q 适配
 *
 * 所有导出接口保持与原 Express 后端完全一致的调用签名和返回格式，
 * 前端组件（页面、上下文）无需任何修改。
 *
 * 映射关系：
 *   博客文章 → Discuz threads
 *   博客评论 → Discuz posts
 *   博客用户 → Discuz users
 *   博客标签 → Discuz topics
 */

/* ── 认证 API ─────────────────────────── */
export const authAPI = {
  /**
   * 用户注册
   * Discuz! Q: POST /register
   */
  register: async ({ username, email, password }) => {
    const res = await dzq.post('/register', {
      data: {
        type: 'users',
        attributes: { username, password, email },
      },
    });
    const { token, user } = transformLoginResponse(res);
    return { data: { token, user } };
  },

  /**
   * 用户登录
   * Discuz! Q: POST /login
   */
  login: async ({ email, password }) => {
    // Discuz! Q 用 username 登录，但也可能支持 email
    // 先尝试用 email 作为 username 登录
    const res = await dzq.post('/login', {
      data: {
        attributes: { username: email, password },
      },
    });
    const { token, user } = transformLoginResponse(res);

    // 如果用户信息不完整，再拉一次完整信息
    if (user.id && !user.email) {
      try {
        const profileRes = await dzq.get(`/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fullUser = transformUser(profileRes.data);
        return { data: { token, user: { ...user, ...fullUser } } };
      } catch {
        // 静默，使用不完整的用户信息
      }
    }
    return { data: { token, user } };
  },

  /**
   * 获取当前用户信息
   * Discuz! Q: GET /users/{id}
   */
  getMe: async () => {
    // 从本地获取用户 ID，再查 Discuz 用户详情
    const savedUser = localStorage.getItem(USER_KEY);
    const userId = savedUser ? JSON.parse(savedUser)?.id : null;
    if (!userId) throw { message: '未登录' };

    const res = await dzq.get(`/users/${userId}`);
    const user = transformUser(res.data);
    return { data: user };
  },

  /**
   * 更新个人信息
   * Discuz! Q: PATCH /users/{id}
   */
  updateProfile: async ({ username, bio, avatar }) => {
    const savedUser = localStorage.getItem(USER_KEY);
    const userId = savedUser ? JSON.parse(savedUser)?.id : null;
    if (!userId) throw { message: '未登录' };

    const res = await dzq.patch(`/users/${userId}`, {
      data: {
        type: 'users',
        attributes: {
          ...(username && { username }),
          ...(bio !== undefined && { signature: bio }),
          ...(avatar && { avatarUrl: avatar }),
        },
      },
    });
    const user = transformUser(res.data);
    return { data: user };
  },

  /**
   * 修改密码
   * Discuz! Q: PUT /users/{id}/password 或 PATCH /users/{id}
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    const savedUser = localStorage.getItem(USER_KEY);
    const userId = savedUser ? JSON.parse(savedUser)?.id : null;
    if (!userId) throw { message: '未登录' };

    await dzq.patch(`/users/${userId}`, {
      data: {
        type: 'users',
        attributes: {
          password: newPassword,
          password_confirmation: newPassword,
          pay_password_token: currentPassword, // Discuz! Q 部分版本使用此字段验证旧密码
        },
      },
    });
    return { message: '密码已修改' };
  },

  /**
   * 获取用户列表（管理后台）
   * Discuz! Q: GET /users
   */
  getUsers: async (params = {}) => {
    const res = await dzq.get('/users', {
      params: {
        'page[limit]': params.limit || 50,
        'page[number]': params.page || 1,
      },
    });
    return transformUserList(res);
  },

  /**
   * 切换用户状态（禁用/启用）
   * Discuz! Q: PATCH /users/{id}
   */
  toggleUser: async (id) => {
    // 先获取当前状态
    const userRes = await dzq.get(`/users/${id}`);
    const currentStatus = userRes.data?.attributes?.status;
    // 状态取反：0=正常, 1=禁用
    const newStatus = currentStatus === 0 ? 1 : 0;

    const res = await dzq.patch(`/users/${id}`, {
      data: {
        type: 'users',
        attributes: { status: newStatus },
      },
    });
    const user = transformUser(res.data);
    return { data: user };
  },
};

/* ── 文章 API ─────────────────────────── */
export const articleAPI = {
  /**
   * 获取文章列表
   * Discuz! Q: GET /threads
   */
  getAll: async (params = {}) => {
    const dzqParams = {
      'include': 'user,firstPost,category,topic',
      'page[number]': params.page || 1,
      'page[limit]': params.limit || DEFAULT_PAGE_SIZE,
    };

    // 排序
    if (params.sort === 'popular') dzqParams.sort = '-viewCount';
    else if (params.sort === 'mostLiked') dzqParams.sort = '-likeCount';
    else dzqParams.sort = '-createdAt';

    // 分类筛选
    if (params.category) dzqParams['filter[categoryId]'] = params.category;
    // 标签筛选
    if (params.tag) dzqParams['filter[topic]'] = params.tag;

    const res = await dzq.get('/threads', { params: dzqParams });
    return transformThreadList(res);
  },

  /**
   * 按 ID 获取文章详情（原 getBySlug，Discuz 用 ID 代替 slug）
   * Discuz! Q: GET /threads/{id}
   */
  getBySlug: async (slugOrId) => {
    const res = await dzq.get(`/threads/${slugOrId}`, {
      params: { include: 'user,firstPost,firstPost.images,category,topic' },
    });
    const article = transformThread(res.data, res.included || []);
    return { data: article };
  },

  /**
   * 获取当前用户的文章列表
   * Discuz! Q: GET /threads (筛选 userId)
   */
  getMine: async (params = {}) => {
    const savedUser = localStorage.getItem(USER_KEY);
    const userId = savedUser ? JSON.parse(savedUser)?.id : null;
    if (!userId) return { data: [] };

    const dzqParams = {
      'include': 'user,firstPost,category',
      'filter[userId]': userId,
      'page[limit]': params.limit || 50,
      'sort': '-createdAt',
    };
    if (params.status === 'draft') dzqParams['filter[isApproved]'] = 0;
    else if (params.status === 'published') dzqParams['filter[isApproved]'] = 1;

    const res = await dzq.get('/threads', { params: dzqParams });
    const { data } = transformThreadList(res);
    return { data };
  },

  /**
   * 创建文章
   * Discuz! Q: POST /threads
   */
  create: async (formData) => {
    const categoryId = formData.categoryId || DEFAULT_CATEGORY_ID;
    const body = buildThreadBody(formData, categoryId);

    const res = await dzq.post('/threads', body);
    const article = transformThread(res.data, res.included || []);
    return { data: article };
  },

  /**
   * 更新文章
   * Discuz! Q: PATCH /threads/{id}
   */
  update: async (id, formData) => {
    const body = {
      data: {
        type: 'threads',
        attributes: {
          title: formData.title,
          content: formData.content,
        },
      },
    };
    // 如果要发布
    if (formData.status === 'published') {
      body.data.attributes.isApproved = 1;
    }

    const res = await dzq.patch(`/threads/${id}`, body);
    const article = transformThread(res.data, res.included || []);
    return { data: article };
  },

  /**
   * 删除文章
   * Discuz! Q: DELETE /threads/{id}
   */
  delete: async (id) => {
    // Discuz! Q 部分版本用 PATCH 软删除
    try {
      await dzq.delete(`/threads/${id}`);
    } catch {
      // 回退方案：PATCH 设置 isDeleted
      await dzq.patch(`/threads/${id}`, {
        data: { type: 'threads', attributes: { isDeleted: true } },
      });
    }
    return { message: '已删除' };
  },

  /**
   * 点赞/取消点赞（收藏）
   * Discuz! Q: POST/DELETE /threads/{id}/favorites
   */
  toggleLike: async (id) => {
    // 先获取当前状态
    let isLiked = false;
    try {
      const threadRes = await dzq.get(`/threads/${id}`);
      isLiked = threadRes.data?.attributes?.isFavorite || threadRes.data?.attributes?.is_favorite || false;
    } catch { /* 静默 */ }

    if (isLiked) {
      await dzq.delete(`/threads/${id}/favorites`);
    } else {
      await dzq.post(`/threads/${id}/favorites`);
    }

    // 重新获取计数
    const updatedRes = await dzq.get(`/threads/${id}`);
    const likeCount = updatedRes.data?.attributes?.favoriteCount || updatedRes.data?.attributes?.likeCount || 0;
    return { data: { isLiked: !isLiked, likeCount } };
  },

  /**
   * 获取所有标签（话题）
   * Discuz! Q: GET /topics
   */
  getTags: async () => {
    try {
      const res = await dzq.get('/topics', { params: { 'page[limit]': 100 } });
      const data = Array.isArray(res.data) ? res.data : [];
      const tags = data.map((t) => t.attributes?.content || t.attributes?.name || '');
      return { data: tags.filter(Boolean) };
    } catch {
      return { data: [] };
    }
  },
};

/* ── 评论 API ─────────────────────────── */
export const commentAPI = {
  /**
   * 获取文章评论列表
   * Discuz! Q: GET /posts (筛选 threadId)
   */
  getByArticle: async (threadId, params = {}) => {
    const res = await dzq.get('/posts', {
      params: {
        'include': 'user,replyUser,commentPosts,commentPosts.user',
        'filter[thread]': threadId,
        'filter[isComment]': 'no', // 仅主评论，不含楼中楼
        'page[limit]': params.limit || 50,
        'sort': 'createdAt',
      },
    });
    return transformPostList(res);
  },

  /**
   * 发表评论
   * Discuz! Q: POST /posts
   */
  create: async ({ content, articleId, parentCommentId }) => {
    const body = buildPostBody(articleId, content, parentCommentId);
    // 如果是楼中楼回复
    if (parentCommentId) {
      body.data.attributes.isComment = true;
      body.data.relationships.commentPost = {
        data: { type: 'posts', id: String(parentCommentId) },
      };
    }
    const res = await dzq.post('/posts', body);
    return { data: res.data };
  },

  /**
   * 删除评论
   * Discuz! Q: DELETE /posts/{id}
   */
  delete: async (id) => {
    try {
      await dzq.delete(`/posts/${id}`);
    } catch {
      await dzq.patch(`/posts/${id}`, {
        data: { type: 'posts', attributes: { isDeleted: true } },
      });
    }
    return { message: '已删除' };
  },

  /**
   * 点赞评论
   * Discuz! Q: POST/DELETE /posts/{id}/likes
   */
  toggleLike: async (id) => {
    let isLiked = false;
    try {
      const postRes = await dzq.get(`/posts/${id}`);
      isLiked = postRes.data?.attributes?.isLiked || false;
    } catch { /* 静默 */ }

    if (isLiked) {
      await dzq.delete(`/posts/${id}/likes`);
    } else {
      await dzq.post(`/posts/${id}/likes`);
    }

    const updatedRes = await dzq.get(`/posts/${id}`);
    const likeCount = updatedRes.data?.attributes?.likeCount || 0;
    return { data: { isLiked: !isLiked, likeCount } };
  },
};

/* ── 搜索 API ─────────────────────────── */
export const searchAPI = {
  /**
   * 搜索文章
   * Discuz! Q: GET /threads (带关键词)
   */
  search: async (params = {}) => {
    const res = await dzq.get('/threads', {
      params: {
        'include': 'user,firstPost,category',
        'filter[q]': params.q || '',
        'page[limit]': params.limit || 20,
        'sort': '-createdAt',
      },
    });
    const { data } = transformThreadList(res);
    return { data };
  },

  /**
   * 搜索建议
   * Discuz! Q 没有专门的 suggest 接口，复用搜索接口取前 5 条
   */
  suggest: async (q) => {
    if (!q) return { data: [] };
    const res = await dzq.get('/threads', {
      params: {
        'filter[q]': q,
        'page[limit]': 5,
        'fields[threads]': 'title',
      },
    });
    const data = Array.isArray(res.data) ? res.data : [];
    return { data: data.map((t) => t.attributes?.title || '') };
  },
};

export default dzq;
