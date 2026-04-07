const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * 用户模型
 * 角色: admin(管理员) / user(普通用户)
 * 支持密码加密、JWT 生成、密码校验
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      unique: true,
      trim: true,
      minlength: [2, '用户名至少 2 个字符'],
      maxlength: [30, '用户名最多 30 个字符'],
      index: true,
    },
    email: {
      type: String,
      required: [true, '邮箱不能为空'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址'],
      index: true,
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
      minlength: [6, '密码至少 6 个字符'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [200, '简介最多 200 个字符'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * 保存前自动加密密码
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * 校验密码
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * 生成 JWT Token
 */
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * 虚拟字段：用户发布的文章数
 */
userSchema.virtual('articleCount', {
  ref: 'Article',
  localField: '_id',
  foreignField: 'author',
  count: true,
});

module.exports = mongoose.model('User', userSchema);
