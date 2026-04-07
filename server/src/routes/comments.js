const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

/**
 * 评论相关路由
 */

// 获取文章评论
router.get('/article/:articleId', commentController.getComments);

// 创建评论
router.post(
  '/',
  authenticate,
  [
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('评论内容需 1-1000 个字符'),
    body('articleId').isMongoId().withMessage('无效的文章 ID'),
    body('parentCommentId').optional().isMongoId().withMessage('无效的评论 ID'),
  ],
  commentController.createComment
);

// 删除评论
router.delete('/:id', authenticate, commentController.deleteComment);

// 点赞/取消点赞评论
router.put('/:id/like', authenticate, commentController.toggleCommentLike);

module.exports = router;
