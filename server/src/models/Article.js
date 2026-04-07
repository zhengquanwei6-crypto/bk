const mongoose = require('mongoose');

/**
 * 文章模型
 * 支持 Markdown 内容、标签分类、点赞、浏览量统计
 * 使用 MongoDB 全文索引支持搜索功能
 */
const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '文章标题不能为空'],
      trim: true,
      maxlength: [120, '标题最多 120 个字符'],
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, '文章内容不能为空'],
    },
    excerpt: {
      type: String,
      maxlength: [300, '摘要最多 300 个字符'],
    },
    coverImage: {
      type: String,
      default: '',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    category: {
      type: String,
      default: '未分类',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    isTop: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * 全文索引 — 支持标题和内容的搜索
 */
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });

/**
 * 复合索引 — 优化常用查询
 */
articleSchema.index({ status: 1, createdAt: -1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ tags: 1, status: 1 });

/**
 * 保存前自动生成 slug 和摘要
 */
articleSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);
  }
  if (this.isModified('content') && !this.excerpt) {
    this.excerpt = this.content
      .replace(/[#*`>\-\[\]()!]/g, '')
      .substring(0, 200)
      .trim();
  }
  next();
});

/**
 * 虚拟字段：评论列表
 */
articleSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'article',
});

module.exports = mongoose.model('Article', articleSchema);
