import { ADMIN_GROUP_ID } from './discuz-config';

/**
 * Discuz! Q 数据转换层
 *
 * 将 Discuz! Q 的 JSON:API 格式响应转换为博客前端期望的数据格式，
 * 使前端组件无需任何修改即可正常工作。
 *
 * 核心映射关系：
 *   Discuz threads  →  博客文章 (articles)
 *   Discuz posts    →  博客评论 (comments)
 *   Discuz users    →  博客用户 (users)
 *   Discuz categories → 博客分类 (categories)
 *   Discuz topics   →  博客标签 (tags)
 */

/* ── 工具函数 ─────────────────────────── */

/**
 * 从 JSON:API included 数组中查找关联资源
 */
function findIncluded(included, type, id) {
  if (!included || !id) return null;
  return included.find((item) => item.type === type && String(item.id) === String(id));
}

/**
 * 从 relationships 中提取关联 ID
 */
function getRelId(data, relName) {
  return data?.relationships?.[relName]?.data?.id || null;
}

/**
 * 从 relationships 中提取关联 ID 数组（一对多）
 */
function getRelIds(data, relName) {
  const relData = data?.relationships?.[relName]?.data;
  if (!Array.isArray(relData)) return [];
  return relData.map((item) => item.id);
}

/* ── 用户转换 ─────────────────────────── */

/**
 * 将 Discuz! Q 用户数据转换为博客用户格式
 * @param {Object} dzqUser - Discuz JSON:API user resource
 * @returns {Object} 博客格式用户
 */
export function transformUser(dzqUser) {
  if (!dzqUser) return null;
  const attr = dzqUser.attributes || dzqUser;
  const groups = attr.groups || [];
  const isAdmin = groups.some((g) => Number(g.id) === ADMIN_GROUP_ID) || attr.isAdmin;

  return {
    id: dzqUser.id || attr.id,
    _id: dzqUser.id || attr.id,
    username: attr.username || attr.nickname || '',
    email: attr.email || '',
    avatar: attr.avatarUrl || attr.avatar || '',
    bio: attr.signature || attr.bio || '',
    role: isAdmin ? 'admin' : 'user',
    isActive: attr.status === 0 || attr.isActive !== false,
    createdAt: attr.createdAt || attr.created_at || '',
    updatedAt: attr.updatedAt || attr.updated_at || '',
  };
}

/**
 * 从登录/注册响应中提取 token 和用户信息
 */
export function transformLoginResponse(response) {
  // Discuz! Q 登录响应格式：{ data: { id, attributes: { accessToken, ... } } }
  const data = response.data || response;
  const attr = data.attributes || data;

  const token = attr.accessToken || attr.access_token || attr.token || '';
  const userId = data.id || attr.userId || attr.user_id || '';

  // 用户信息可能在 included 或 attributes 中
  let user = null;
  if (response.included) {
    const userResource = findIncluded(response.included, 'users', userId);
    if (userResource) user = transformUser(userResource);
  }

  // 如果 included 中没有，从 attributes 中构造
  if (!user) {
    user = {
      id: userId,
      _id: userId,
      username: attr.username || attr.nickname || '',
      email: attr.email || '',
      avatar: attr.avatarUrl || attr.avatar || '',
      bio: '',
      role: 'user',
    };
  }

  return { token, user };
}

/* ── 帖子/文章转换 ─────────────────────── */

/**
 * 将 Discuz! Q thread 转换为博客文章格式
 * @param {Object} thread - Discuz JSON:API thread resource
 * @param {Array} included - JSON:API included 资源数组
 * @returns {Object} 博客格式文章
 */
export function transformThread(thread, included = []) {
  if (!thread) return null;
  const attr = thread.attributes || {};

  // 获取作者
  const authorId = getRelId(thread, 'user');
  const authorResource = findIncluded(included, 'users', authorId);
  const author = authorResource ? transformUser(authorResource) : { _id: authorId, username: '未知用户' };

  // 获取分类
  const categoryId = getRelId(thread, 'category');
  const categoryResource = findIncluded(included, 'categories', categoryId);
  const category = categoryResource?.attributes?.name || '';

  // 获取标签/话题
  const topicIds = getRelIds(thread, 'topic');
  const tags = topicIds
    .map((id) => findIncluded(included, 'topics', id))
    .filter(Boolean)
    .map((t) => t.attributes?.content || t.attributes?.name || '');

  // 获取首帖内容（Discuz 中 thread 的正文存在第一条 post 里）
  const firstPostId = getRelId(thread, 'firstPost');
  const firstPost = findIncluded(included, 'posts', firstPostId);
  const content = firstPost?.attributes?.content || attr.content || '';

  // 提取摘要（取正文前 200 字，去除 Markdown/HTML 标记）
  const plainText = content.replace(/<[^>]+>/g, '').replace(/[#*`_~\[\]()]/g, '');
  const excerpt = attr.summary || plainText.slice(0, 200);

  return {
    _id: thread.id,
    title: attr.title || '无标题',
    slug: thread.id, // Discuz 没有 slug 概念，用 ID 代替
    content,
    excerpt,
    coverImage: attr.coverImage || attr.attachment?.url || '',
    tags,
    category,
    author: {
      _id: author.id || author._id,
      username: author.username,
      avatar: author.avatar,
    },
    viewCount: attr.viewCount || attr.view_count || 0,
    likeCount: attr.likeCount || attr.like_count || attr.favoriteCount || 0,
    commentCount: attr.postCount ? attr.postCount - 1 : (attr.post_count ? attr.post_count - 1 : 0),
    likes: [], // Discuz! Q 不直接返回点赞用户列表
    isLiked: attr.isFavorite || attr.is_favorite || false,
    status: attr.isApproved === 1 || attr.is_approved === 1 ? 'published' : 'draft',
    isTop: attr.isSticky || attr.is_sticky || false,
    createdAt: attr.createdAt || attr.created_at || '',
    updatedAt: attr.updatedAt || attr.updated_at || '',
  };
}

/**
 * 转换帖子列表响应（含分页）
 */
export function transformThreadList(response) {
  const data = Array.isArray(response.data) ? response.data : [];
  const included = response.included || [];
  const meta = response.meta || {};

  const articles = data.map((thread) => transformThread(thread, included));

  // Discuz! Q 分页信息在 meta 中
  const pagination = {
    page: meta.pageCount ? Math.min(meta.currentPage || 1, meta.pageCount) : 1,
    pages: meta.pageCount || 1,
    total: meta.threadCount || meta.total || data.length,
  };

  return { data: articles, pagination };
}

/* ── 评论转换 ─────────────────────────── */

/**
 * 将 Discuz! Q post (回帖) 转换为博客评论格式
 */
export function transformPost(post, included = []) {
  if (!post) return null;
  const attr = post.attributes || {};

  // 获取评论作者
  const authorId = getRelId(post, 'user');
  const authorResource = findIncluded(included, 'users', authorId);
  const author = authorResource
    ? transformUser(authorResource)
    : { _id: authorId, username: '匿名' };

  // 获取回复列表
  const replyIds = getRelIds(post, 'commentPosts') || [];
  const replies = replyIds
    .map((id) => findIncluded(included, 'posts', id))
    .filter(Boolean)
    .map((reply) => transformPost(reply, included));

  return {
    _id: post.id,
    content: attr.content || attr.contentHtml || '',
    author: {
      _id: author.id || author._id,
      username: author.username,
      avatar: author.avatar,
    },
    likeCount: attr.likeCount || attr.like_count || 0,
    isLiked: attr.isLiked || attr.is_liked || false,
    createdAt: attr.createdAt || attr.created_at || '',
    replies,
  };
}

/**
 * 转换评论列表
 */
export function transformPostList(response) {
  const data = Array.isArray(response.data) ? response.data : [];
  const included = response.included || [];

  // 过滤掉首帖（isFirst=true 的是文章正文，不是评论）
  const comments = data
    .filter((post) => !post.attributes?.isFirst && !post.attributes?.is_first)
    .map((post) => transformPost(post, included));

  return { data: comments };
}

/* ── 分类和标签转换 ─────────────────────── */

/**
 * 转换分类列表
 */
export function transformCategories(response) {
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map((cat) => ({
    id: cat.id,
    name: cat.attributes?.name || '',
    description: cat.attributes?.description || '',
    threadCount: cat.attributes?.threadCount || 0,
    sort: cat.attributes?.sort || 0,
  }));
}

/* ── 用户列表转换（管理后台） ──────────── */

/**
 * 转换用户列表
 */
export function transformUserList(response) {
  const data = Array.isArray(response.data) ? response.data : [];
  const included = response.included || [];
  return {
    data: data.map((user) => transformUser(user)),
  };
}

/* ── 构建 JSON:API 请求体 ─────────────── */

/**
 * 构建创建帖子的请求体
 */
export function buildThreadBody(formData, categoryId) {
  return {
    data: {
      type: 'threads',
      attributes: {
        title: formData.title,
        content: formData.content,
        type: 1, // 1 = 长文/文章类型
      },
      relationships: {
        category: {
          data: { type: 'categories', id: String(categoryId) },
        },
      },
    },
  };
}

/**
 * 构建回帖（评论）的请求体
 */
export function buildPostBody(threadId, content, replyPostId) {
  const body = {
    data: {
      type: 'posts',
      attributes: {
        content,
      },
      relationships: {
        thread: {
          data: { type: 'threads', id: String(threadId) },
        },
      },
    },
  };

  // 如果是回复某条评论
  if (replyPostId) {
    body.data.relationships.replyPost = {
      data: { type: 'posts', id: String(replyPostId) },
    };
  }

  return body;
}
