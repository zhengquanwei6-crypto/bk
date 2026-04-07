const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

/**
 * 认证相关路由
 */

// 注册
router.post(
  '/register',
  authLimiter,
  [
    body('username').trim().isLength({ min: 2, max: 30 }).withMessage('用户名需 2-30 个字符'),
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱'),
    body('password').isLength({ min: 6 }).withMessage('密码至少 6 个字符'),
  ],
  authController.register
);

// 登录
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  authController.login
);

// 获取当前用户
router.get('/me', authenticate, authController.getMe);

// 更新个人信息
router.put('/profile', authenticate, authController.updateProfile);

// 修改密码
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('请输入当前密码'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码至少 6 个字符'),
  ],
  authController.changePassword
);

// 管理员：获取所有用户
router.get('/users', authenticate, authorize('admin'), authController.getUsers);

// 管理员：切换用户状态
router.put('/users/:id/toggle', authenticate, authorize('admin'), authController.toggleUserStatus);

module.exports = router;
