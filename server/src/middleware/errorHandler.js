/**
 * 全局错误处理中间件
 * 统一错误响应格式，区分开发/生产环境
 */

/**
 * 自定义应用错误类
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 未找到处理
 */
const notFound = (req, res, next) => {
  const error = new AppError(`找不到路径: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * 全局错误处理器
 */
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('；');
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    const fieldMap = { username: '用户名', email: '邮箱', slug: '文章链接' };
    message = `${fieldMap[field] || field} 已存在`;
  }

  // Mongoose ObjectId 错误
  if (err.name === 'CastError') {
    statusCode = 400;
    message = '无效的资源 ID';
  }

  const response = {
    success: false,
    message,
  };

  // 开发环境返回详细错误栈
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  console.error(`[错误] ${statusCode} - ${message}${err.stack ? '\n' + err.stack : ''}`);

  res.status(statusCode).json(response);
};

module.exports = { AppError, notFound, errorHandler };
