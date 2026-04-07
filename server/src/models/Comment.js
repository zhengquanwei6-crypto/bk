const mongoose = require('mongoose');

/**
 * 评论模型
 * 支持嵌套回复（parentComment 字段）
 * 支持点赞功能
 */
const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, '评论内容不能为空'],
      trim: true,
      maxlength: [1000, '评论最多 1000 个字符'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
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
    isDeleted: {
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
 * 索引优化
 */
commentSchema.index({ article: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

/**
 * 虚拟字段：子评论
 */
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

/**
 * 删除评论后更新文章评论数
 */
commentSchema.post('save', async function () {
  const Article = mongoose.model('Article');
  const count = await mongoose.model('Comment').countDocuments({
    article: this.article,
    isDeleted: false,
  });
  await Article.findByIdAndUpdate(this.article, { commentCount: count });
});

module.exports = mongoose.model('Comment', commentSchema);
