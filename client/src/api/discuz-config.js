/**
 * Discuz! Q 后台配置
 *
 * 使用说明：
 * 1. 将 DISCUZ_BASE_URL 改为你的 Discuz! Q 实际地址
 * 2. 如果 Discuz! Q 开启了跨域限制，需要在 Discuz 后台配置 CORS 允许本站域名
 * 3. DEFAULT_CATEGORY_ID 设为博客文章所属的 Discuz 分类 ID
 */

// Discuz! Q 服务器地址（修改为你的实际地址）
export const DISCUZ_BASE_URL = import.meta.env.VITE_DISCUZ_URL || 'http://localhost:8080';

// Discuz! Q API 基础路径
export const DISCUZ_API = `${DISCUZ_BASE_URL}/api`;

// 默认分类 ID（博客文章发布到哪个 Discuz 分类下）
export const DEFAULT_CATEGORY_ID = import.meta.env.VITE_DISCUZ_CATEGORY_ID || 1;

// 每页默认条数
export const DEFAULT_PAGE_SIZE = 10;

// 管理员角色 ID（Discuz! Q 中管理员的 group_id，通常为 1）
export const ADMIN_GROUP_ID = 1;

// 本地存储 key
export const TOKEN_KEY = 'dzq_token';
export const USER_KEY = 'dzq_user';
