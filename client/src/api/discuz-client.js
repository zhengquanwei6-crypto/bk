import axios from 'axios';
import { DISCUZ_API, TOKEN_KEY } from './discuz-config';

/**
 * Discuz! Q HTTP 客户端
 * 基于 axios，自动附加 token、统一错误处理
 */
const dzqClient = axios.create({
  baseURL: DISCUZ_API,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：自动附加 Discuz! Q token
dzqClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一错误处理
dzqClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Discuz! Q 错误格式：{ errors: [{ code, detail, status }] }
    const dzqErrors = error.response?.data?.errors;
    let message = '网络请求失败';

    if (dzqErrors && dzqErrors.length > 0) {
      message = dzqErrors[0].detail || dzqErrors[0].code || message;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    }

    // 401 未认证，清除本地 token 并跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('dzq_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default dzqClient;
