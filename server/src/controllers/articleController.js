const { validationResult } = require('express-validator');
const Article = require('../models/Article');
const { AppError } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');

/**
 * @desc    获取文章列表（支持分页、筛选、排序）
 * @route   GET /api/articles
 * @access  公开
 */
exports.getArticles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = { status: 'published' };
    if (req.query.tag) query.tags = req.query.tag;
    if (req.query.category) query.category = req.query.category;
    if (req.query.author) query.author = req.query.author;

    // 排序
    const sortMap = {
      latest: { createdAt: -1 },
      popular: { viewCount: -1 },
      mostLiked: { likeCount: -1 },
    };
    const sort = sortMap[req.query.sort] || { isTop: -1, createdAt: -1 };

    // 尝试从缓存读取
    const cacheKey = `articles:${JSON.stringify({ query, sort, page, limit })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached, fromCache: true });
    }

    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate('author', 'username avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Article.countDocuments(query),
    ]);

    const result = {
      data: articles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    // 写入缓存，TTL 60 秒
    await cache.set(cacheKey, result, 60);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单篇文章
 * @route   GET /api/articles/:slug
 * @access  公开
 */
exports.getArticle = async (req, res, next) => {
  try {
    const { slug } = req.params;

    // 尝试缓存
    const cached = await cache.get(`article:${slug}`);
    if (cached) {
      // 异步增加浏览量
      Article.findByIdAndUpdate(cached._id, { $inc: { viewCount: 1 } }).exec();
      return res.json({ success: true, data: cached, fromCache: true });
    }

    const article = await Article.findOne({ slug, status: 'published' })
      .populate('author', 'username avatar bio')
      .lean();

    if (!article) {
      throw new AppError('文章不存在', 404);
    }

    // 增加浏览量
    await Article.findByIdAndUpdate(article._id, { $inc: { viewCount: 1 } });
    article.viewCount += 1;

    // 缓存 5 分钟
    await cache.set(`article:${slug}`, article, 300);

    res.json({ success: true, data: article });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建文章
 * @route   POST /api/articles
 * @access  需登录
 */
exports.createArticle = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, content, excerpt, coverImage, tags, category, status } = req.body;

    const article = await Article.create({
      title,
      content,
      excerpt,
      coverImage,
      tags: tags || [],
      category,
      status: status || 'draft',
      author: req.user.id,
    });

    await article.populate('author', 'username avatar');

    // 清除文章列表缓存
    await cache.delPattern('articles:*');

    res.status(201).json({
      success: true,
      message: '文章创建成功',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新文章
 * @route   PUT /api/articles/:id
 * @access  需登录（作者或管理员）
 */
exports.updateArticle = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let article = await Article.findById(req.params.id);
    if (!article) throw new AppError('文章不存在', 404);

    // 权限检查：只有作者或管理员可编辑
    if (article.author.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('没有权限编辑此文章', 403);
    }

    const allowedFields = ['title', 'content', 'excerpt', 'coverImage', 'tags', 'category', 'status', 'isTop'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    article = await Article.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('author', 'username avatar');

    // 清除缓存
    await cache.del(`article:${article.slug}`);
    await cache.delPattern('articles:*');

    res.json({
      success: true,
      message: '文章已更新',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除文章
 * @route   DELETE /api/articles/:id
 * @access  需登录（作者或管理员）
 */
exports.deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) throw new AppError('文章不存在', 404);

    if (article.author.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('没有权限删除此文章', 403);
    }

    await article.deleteOne();

    // 清除缓存
    await cache.del(`article:${article.slug}`);
    await cache.delPattern('articles:*');

    res.json({ success: true, message: '文章已删除' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    点赞/取消点赞
 * @route   PUT /api/articles/:id/like
 * @access  需登录
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) throw new AppError('文章不存在', 404);

    const userId = req.user.id;
    const index = article.likes.indexOf(userId);

    if (index === -1) {
      article.likes.push(userId);
      article.likeCount += 1;
    } else {
      article.likes.splice(index, 1);
      article.likeCount -= 1;
    }

    await article.save();
    await cache.del(`article:${article.slug}`);

    res.json({
      success: true,
      message: index === -1 ? '已点赞' : '已取消点赞',
      data: { likeCount: article.likeCount, isLiked: index === -1 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取当前用户的文章（含草稿）
 * @route   GET /api/articles/my/list
 * @access  需登录
 */
exports.getMyArticles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { author: req.user.id };
    if (req.query.status) query.status = req.query.status;

    const [articles, total] = await Promise.all([
      Article.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Article.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取所有标签
 * @route   GET /api/articles/meta/tags
 * @access  公开
 */
exports.getTags = async (req, res, next) => {
  try {
    const cached = await cache.get('tags');
    if (cached) return res.json({ success: true, data: cached });

    const tags = await Article.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    await cache.set('tags', tags, 600);
    res.json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};
