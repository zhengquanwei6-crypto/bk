const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * 文章相关路由
 */

// 获取所有标签
router.get('/meta/tags', articleController.getTags);

// 获取当前用户文章
router.get('/my/list', authenticate, articleController.getMyArticles);

// 获取文章列表
router.get('/', optionalAuth, articleController.getArticles);

// 获取单篇文章
router.get('/:slug', optionalAuth, articleController.getArticle);

// 创建文章
router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 1, max: 120 }).withMessage('标题需 1-120 个字符'),
    body('content').notEmpty().withMessage('内容不能为空'),
  ],
  articleController.createArticle
);

// 更新文章
router.put(
  '/:id',
  authenticate,
  [
    body('title').optional().trim().isLength({ min: 1, max: 120 }).withMessage('标题需 1-120 个字符'),
  ],
  articleController.updateArticle
);

// 删除文章
router.delete('/:id', authenticate, articleController.deleteArticle);

// 点赞/取消点赞
router.put('/:id/like', authenticate, articleController.toggleLike);

module.exports = router;
