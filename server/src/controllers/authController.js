const { validationResult } = require('express-validator');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    用户注册
 * @route   POST /api/auth/register
 * @access  公开
 */
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new AppError(
        existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用',
        400
      );
    }

    const user = await User.create({ username, email, password });
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    用户登录
 * @route   POST /api/auth/login
 * @access  公开
 */
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('邮箱或密码错误', 401);
    }

    if (!user.isActive) {
      throw new AppError('账户已被禁用，请联系管理员', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('邮箱或密码错误', 401);
    }

    const token = user.generateToken();

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取当前用户信息
 * @route   GET /api/auth/me
 * @access  需登录
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('articleCount');
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新个人信息
 * @route   PUT /api/auth/profile
 * @access  需登录
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { username, bio, avatar } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: '个人信息已更新',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    修改密码
 * @route   PUT /api/auth/password
 * @access  需登录
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('当前密码错误', 400);
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateToken();
    res.json({
      success: true,
      message: '密码已修改',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取所有用户（管理员）
 * @route   GET /api/auth/users
 * @access  管理员
 */
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    切换用户状态（管理员）
 * @route   PUT /api/auth/users/:id/toggle
 * @access  管理员
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('用户不存在', 404);
    if (user.role === 'admin') throw new AppError('无法操作管理员账户', 403);

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? '用户已启用' : '用户已禁用',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
