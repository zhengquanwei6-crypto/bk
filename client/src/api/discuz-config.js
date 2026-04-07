/**
 * Discuz! Q backend config
 */
export const DISCUZ_BASE_URL = import.meta.env.VITE_DISCUZ_URL || 'http://localhost:8080';

// v3 API is the default for current DiscuzQ container images
export const DISCUZ_API = import.meta.env.VITE_DISCUZ_API || `${DISCUZ_BASE_URL}/api/v3`;

export const DEFAULT_CATEGORY_ID = Number(import.meta.env.VITE_DISCUZ_CATEGORY_ID || 1);
export const DEFAULT_PAGE_SIZE = 10;
export const ADMIN_GROUP_ID = 1;

export const TOKEN_KEY = 'dzq_token';
export const USER_KEY = 'dzq_user';
