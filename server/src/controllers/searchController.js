const Article = require('../models/Article');
const { cache } = require('../config/redis');

/**
 * @desc    全文搜索文章
 * @route   GET /api/search
 * @access  公开
 */
exports.searchArticles = async (req, res, next) => {
  try {
    const { q, tag, category, page: pageStr, limit: limitStr } = req.query;
    const page = parseInt(pageStr) || 1;
    const limit = parseInt(limitStr) || 10;
    const skip = (page - 1) * limit;

    if (!q && !tag && !category) {
      return res.status(400).json({ success: false, message: '请输入搜索关键词' });
    }

    // 尝试缓存
    const cacheKey = `search:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, ...cached, fromCache: true });

    const query = { status: 'published' };

    // MongoDB 全文搜索
    if (q) {
      query.$text = { $search: q };
    }
    if (tag) query.tags = tag;
    if (category) query.category = category;

    // 构建搜索管道
    const projection = q ? { score: { $meta: 'textScore' } } : {};
    const sort = q ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

    const [articles, total] = await Promise.all([
      Article.find(query, projection)
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
      query: { q, tag, category },
    };

    // 缓存 30 秒
    await cache.set(cacheKey, result, 30);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    搜索建议（自动补全）
 * @route   GET /api/search/suggest
 * @access  公开
 */
exports.searchSuggest = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const cacheKey = `suggest:${q}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const regex = new RegExp(q, 'i');
    const articles = await Article.find(
      { status: 'published', $or: [{ title: regex }, { tags: regex }] },
      { title: 1, slug: 1, tags: 1 }
    )
      .limit(8)
      .lean();

    await cache.set(cacheKey, articles, 60);

    res.json({ success: true, data: articles });
  } catch (error) {
    next(error);
  }
};
