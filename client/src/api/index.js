import dzq from './discuz-client';
import { DEFAULT_CATEGORY_ID, DEFAULT_PAGE_SIZE, USER_KEY } from './discuz-config';

function mapUserFromV3(user = {}) {
  const userId = user.userId || user.id;
  return {
    id: String(userId || ''),
    _id: String(userId || ''),
    username: user.username || user.nickname || '',
    email: user.email || '',
    avatar: user.avatarUrl || user.avatar || '',
    bio: user.signature || '',
    role: Number(userId) === 1 ? 'admin' : 'user',
    isActive: user.status === undefined ? true : Number(user.status) === 0,
    createdAt: user.joinedAt || user.createdAt || '',
    updatedAt: user.updatedAt || user.loginAt || '',
  };
}

function toPlainText(text = '') {
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function mapThreadFromV3(thread = {}, currentUserId = '') {
  const textContent = thread.content?.text || thread.content || '';
  const plain = toPlainText(textContent);
  const isLiked = Boolean(thread.isFavorite || thread.isLike);

  return {
    _id: String(thread.threadId || thread.id || ''),
    title: thread.title || '无标题',
    slug: String(thread.threadId || thread.id || ''),
    content: textContent,
    excerpt: plain.slice(0, 200),
    coverImage: '',
    tags: [],
    category: thread.categoryName || '',
    author: {
      _id: String(thread.user?.userId || thread.userId || ''),
      username: thread.user?.nickname || thread.user?.username || '未知用户',
      avatar: thread.user?.avatar || '',
    },
    viewCount: Number(thread.viewCount || 0),
    likeCount: Number(thread.likeReward?.likePayCount || 0),
    commentCount: Number(thread.likeReward?.postCount || 0),
    likes: isLiked && currentUserId ? [String(currentUserId)] : [],
    isLiked,
    status: thread.isDraft ? 'draft' : 'published',
    isTop: Boolean(thread.isStick),
    createdAt: thread.createdAt || '',
    updatedAt: thread.updatedAt || '',
  };
}

function mapThreadListFromV3(payload, currentUserId = '') {
  const data = payload?.Data || {};
  const pageData = Array.isArray(data.pageData) ? data.pageData : [];

  return {
    data: pageData.map((item) => mapThreadFromV3(item, currentUserId)),
    pagination: {
      page: Number(data.currentPage || 1),
      pages: Number(data.totalPage || 1),
      total: Number(data.totalCount || pageData.length),
    },
  };
}

function mapPostFromV3(post = {}) {
  return {
    _id: String(post.id || ''),
    content: toPlainText(post.content || post.summaryText || ''),
    author: {
      _id: String(post.user?.id || post.userId || ''),
      username: post.user?.nickname || post.user?.username || '匿名',
      avatar: post.user?.avatar || '',
    },
    likeCount: Number(post.likeCount || 0),
    isLiked: Boolean(post.isLiked),
    createdAt: post.createdAt || '',
    replies: Array.isArray(post.lastThreeComments)
      ? post.lastThreeComments.map((r) => mapPostFromV3(r))
      : [],
  };
}

function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const authAPI = {
  register: async ({ username, email, password }) => {
    const account = (username || email || '').trim();
    const res = await dzq.post('/users/username.register', {
      username: account,
      nickname: account,
      password,
      passwordConfirmation: password,
    });

    const data = res.Data || {};
    const user = {
      id: String(data.userId || ''),
      _id: String(data.userId || ''),
      username: account,
      email: email || '',
      avatar: data.avatarUrl || '',
      bio: '',
      role: Number(data.userId) === 1 ? 'admin' : 'user',
      isActive: Number(data.userStatus || 0) === 0,
    };

    return { data: { token: data.accessToken || '', user } };
  },

  login: async ({ email, password }) => {
    const identifier = (email || '').trim();
    const res = await dzq.post('/users/username.login', {
      username: identifier,
      password,
    });

    const data = res.Data || {};
    const token = data.accessToken || '';
    const userId = String(data.userId || data.uid || '');

    let user = {
      id: userId,
      _id: userId,
      username: identifier,
      email: '',
      avatar: data.avatarUrl || '',
      bio: '',
      role: Number(userId) === 1 ? 'admin' : 'user',
      isActive: Number(data.userStatus || 0) === 0,
    };

    if (userId) {
      try {
        const profile = await dzq.get('/user', { params: { userId } });
        user = mapUserFromV3(profile.Data || {});
      } catch {
        // keep fallback user
      }
    }

    return { data: { token, user } };
  },

  getMe: async () => {
    const saved = getCurrentUser();
    if (!saved?.id) throw { message: '未登录' };

    const res = await dzq.get('/user', { params: { userId: saved.id } });
    return { data: mapUserFromV3(res.Data || {}) };
  },

  updateProfile: async ({ username, bio }) => {
    const body = {
      ...(username ? { nickname: username } : {}),
      ...(bio !== undefined ? { signature: bio } : {}),
    };

    const res = await dzq.post('/users/update.user', body);
    const data = res.Data || {};
    return {
      data: {
        id: String(data.id || ''),
        _id: String(data.id || ''),
        username: data.nickname || username || '',
        avatar: data.avatar || '',
        bio: data.signature || bio || '',
      },
    };
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await dzq.post('/users/update.user', {
      password: currentPassword,
      newPassword,
      passwordConfirmation: newPassword,
    });
    return { message: '密码已修改' };
  },

  getUsers: async (params = {}) => {
    const res = await dzq.get('/users.list', {
      params: {
        page: params.page || 1,
        perPage: params.limit || 50,
      },
    });

    const pageData = res.Data?.pageData || [];
    return {
      data: pageData.map((u) => ({
        _id: String(u.userId || ''),
        id: String(u.userId || ''),
        username: u.nickname || '',
        email: '',
        role: Number(u.userId) === 1 ? 'admin' : 'user',
        isActive: true,
        createdAt: u.joinedAt || '',
      })),
    };
  },

  toggleUser: async () => {
    throw { message: '当前 DiscuzQ 版本不支持前台直接禁用用户，请在后台管理面板操作。' };
  },
};

export const articleAPI = {
  getAll: async (params = {}) => {
    const saved = getCurrentUser();
    const currentUserId = saved?.id || '';

    const filter = {};
    if (params.category) {
      filter.categoryids = [Number(params.category)].filter(Boolean);
    }
    if (params.tag) {
      filter.search = String(params.tag);
    }

    let sort = 1;
    if (params.sort === 'popular' || params.sort === 'mostLiked') sort = 3;

    const query = {
      page: params.page || 1,
      perPage: params.limit || DEFAULT_PAGE_SIZE,
      filter: { ...filter, sort },
    };

    if (!Object.keys(filter).length) {
      query.filter = { sort };
    }

    const res = await dzq.get('/thread.list', { params: query });
    return mapThreadListFromV3(res, currentUserId);
  },

  getBySlug: async (slugOrId) => {
    const saved = getCurrentUser();
    const currentUserId = saved?.id || '';

    const res = await dzq.get('/thread.detail', {
      params: { threadId: slugOrId },
    });

    return { data: mapThreadFromV3(res.Data || {}, currentUserId) };
  },

  getMine: async (params = {}) => {
    const saved = getCurrentUser();
    if (!saved?.id) return { data: [] };

    const res = await dzq.get('/thread.list', {
      params: {
        page: 1,
        perPage: params.limit || 50,
        filter: {
          complex: 5,
          toUserId: Number(saved.id),
        },
      },
    });

    let list = mapThreadListFromV3(res, saved.id).data;
    if (params.status) {
      list = list.filter((item) => item.status === params.status);
    }

    return { data: list };
  },

  create: async (formData) => {
    const payload = {
      title: formData.title,
      categoryId: Number(formData.categoryId || DEFAULT_CATEGORY_ID),
      draft: formData.status === 'draft',
      content: {
        text: formData.content,
        images: [],
        attachments: [],
        audio: [],
        video: [],
      },
    };

    const res = await dzq.post('/thread.create', payload);
    const saved = getCurrentUser();
    return { data: mapThreadFromV3(res.Data || {}, saved?.id || '') };
  },

  update: async (id, formData) => {
    const payload = {
      threadId: Number(id),
      title: formData.title,
      draft: formData.status === 'draft',
      content: {
        text: formData.content,
        images: [],
        attachments: [],
        audio: [],
        video: [],
      },
    };

    const res = await dzq.post('/thread.update', payload);
    const saved = getCurrentUser();
    return { data: mapThreadFromV3(res.Data || {}, saved?.id || '') };
  },

  delete: async (id) => {
    await dzq.post('/thread.delete', { threadId: Number(id) });
    return { message: '已删除' };
  },

  toggleLike: async (id) => {
    const detail = await dzq.get('/thread.detail', { params: { threadId: id } });
    const isFavorite = Boolean(detail.Data?.isFavorite || detail.Data?.isLike);

    await dzq.post('/threads/operate', {
      id: Number(id),
      isFavorite: !isFavorite,
    });

    const updated = await dzq.get('/thread.detail', { params: { threadId: id } });
    return {
      data: {
        isLiked: Boolean(updated.Data?.isFavorite || updated.Data?.isLike),
        likeCount: Number(updated.Data?.likeReward?.likePayCount || 0),
      },
    };
  },

  getTags: async () => {
    const res = await dzq.get('/categories');
    const list = Array.isArray(res.Data) ? res.Data : [];
    return {
      data: list.map((c) => ({
        _id: c.name || c.categoryId,
        count: Number(c.threadCount || 0),
      })),
    };
  },
};

export const commentAPI = {
  getByArticle: async (threadId, params = {}) => {
    const res = await dzq.get('/posts.list', {
      params: {
        page: params.page || 1,
        perPage: params.limit || 50,
        filter: { thread: Number(threadId) },
      },
    });

    const list = res.Data?.pageData || [];
    return { data: list.map((p) => mapPostFromV3(p)) };
  },

  create: async ({ content, articleId, parentCommentId }) => {
    const payload = {
      threadId: Number(articleId),
      content,
    };

    if (parentCommentId) {
      payload.isComment = true;
      payload.commentPostId = Number(parentCommentId);
      payload.replyId = Number(parentCommentId);
    }

    const res = await dzq.post('/posts.create', payload);
    return { data: res.Data || {} };
  },

  delete: async (id) => {
    await dzq.post('/posts.update', {
      postId: Number(id),
      data: { attributes: { isDeleted: true } },
    });
    return { message: '已删除' };
  },

  toggleLike: async (id) => {
    const detail = await dzq.get('/posts.detail', { params: { postId: Number(id) } });
    const isLiked = Boolean(detail.Data?.isLiked);

    const updated = await dzq.post('/posts.update', {
      postId: Number(id),
      data: { attributes: { isLiked: !isLiked } },
    });

    return {
      data: {
        isLiked: Boolean(updated.Data?.isLiked),
        likeCount: Number(updated.Data?.likeCount || 0),
      },
    };
  },
};

export const searchAPI = {
  search: async (params = {}) => {
    const saved = getCurrentUser();
    const res = await dzq.get('/thread.list', {
      params: {
        scope: 2,
        page: params.page || 1,
        perPage: params.limit || 20,
        filter: { search: params.q || '' },
      },
    });

    return { data: mapThreadListFromV3(res, saved?.id || '').data };
  },

  suggest: async (q) => {
    if (!q) return { data: [] };
    const res = await dzq.get('/thread.list', {
      params: {
        scope: 2,
        page: 1,
        perPage: 5,
        filter: { search: q },
      },
    });

    const titles = (res.Data?.pageData || []).map((t) => t.title).filter(Boolean);
    return { data: titles };
  },
};

export default dzq;
