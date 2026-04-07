const { validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    获取文章评论（含嵌套回复）
 * @route   GET /api/comments/article/:articleId
 * @access  公开
 */
exports.getComments = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 获取顶级评论
    const [comments, total] = await Promise.all([
      Comment.find({ article: articleId, parentComment: null, isDeleted: false })
        .populate('author', 'username avatar')
        .populate({
          path: 'replies',
          match: { isDeleted: false },
          populate: { path: 'author', select: 'username avatar' },
          options: { sort: { createdAt: 1 }, limit: 5 },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments({ article: articleId, parentComment: null, isDeleted: false }),
    ]);

    res.json({
      success: true,
      data: comments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建评论
 * @route   POST /api/comments
 * @access  需登录
 */
exports.createComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { content, articleId, parentCommentId } = req.body;

    // 验证文章存在
    const article = await Article.findById(articleId);
    if (!article) throw new AppError('文章不存在', 404);

    // 验证父评论存在（如果是回复）
    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent) throw new AppError('要回复的评论不存在', 404);
    }

    const comment = await Comment.create({
      content,
      author: req.user.id,
      article: articleId,
      parentComment: parentCommentId || null,
    });

    await comment.populate('author', 'username avatar');

    res.status(201).json({
      success: true,
      message: '评论发表成功',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除评论（软删除）
 * @route   DELETE /api/comments/:id
 * @access  需登录（作者或管理员）
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new AppError('评论不存在', 404);

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('没有权限删除此评论', 403);
    }

    comment.isDeleted = true;
    comment.content = '该评论已被删除';
    await comment.save();

    res.json({ success: true, message: '评论已删除' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    点赞/取消点赞评论
 * @route   PUT /api/comments/:id/like
 * @access  需登录
 */
exports.toggleCommentLike = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new AppError('评论不存在', 404);

    const userId = req.user.id;
    const index = comment.likes.indexOf(userId);

    if (index === -1) {
      comment.likes.push(userId);
      comment.likeCount += 1;
    } else {
      comment.likes.splice(index, 1);
      comment.likeCount -= 1;
    }

    await comment.save();

    res.json({
      success: true,
      message: index === -1 ? '已点赞' : '已取消点赞',
      data: { likeCount: comment.likeCount, isLiked: index === -1 },
    });
  } catch (error) {
    next(error);
  }
};
