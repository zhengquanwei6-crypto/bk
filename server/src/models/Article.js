const mongoose = require('mongoose');

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

articleSchema.index({ title: 'text', content: 'text', tags: 'text' });
articleSchema.index({ status: 1, createdAt: -1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ tags: 1, status: 1 });

const toSafeSlug = (title) => {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${base || 'article'}-${Date.now().toString(36)}`;
};

articleSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = toSafeSlug(this.title);
  }

  if (this.isModified('content') && !this.excerpt) {
    this.excerpt = this.content
      .replace(/[#*`>\-\[\]()!]/g, '')
      .substring(0, 200)
      .trim();
  }

  next();
});

articleSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'article',
});

module.exports = mongoose.model('Article', articleSchema);
