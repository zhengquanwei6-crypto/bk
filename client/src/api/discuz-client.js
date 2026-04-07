import axios from 'axios';
import { DISCUZ_API, TOKEN_KEY, USER_KEY } from './discuz-config';

const dzqClient = axios.create({
  baseURL: DISCUZ_API,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

dzqClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

dzqClient.interceptors.response.use(
  (response) => {
    const payload = response.data;

    // DiscuzQ v3 style: { Code, Message, Data }
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'Code')) {
      if (Number(payload.Code) !== 0) {
        const message = payload.Message || '请求失败';
        return Promise.reject({ message, code: payload.Code, raw: payload });
      }
      return payload;
    }

    // Legacy JSON:API style fallback
    return payload;
  },
  (error) => {
    const responseData = error.response?.data;
    let message = '网络请求失败';

    if (responseData?.Message) {
      message = responseData.Message;
    } else if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
      message = responseData.errors[0].detail || responseData.errors[0].code || message;
    } else if (responseData?.message) {
      message = responseData.message;
    }

    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ message, status: error.response?.status, raw: responseData });
  }
);

export default dzqClient;
