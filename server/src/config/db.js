const mongoose = require('mongoose');

/**
 * 连接 MongoDB 数据库
 * 支持自动重连和连接池配置
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[数据库] MongoDB 已连接: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[数据库] 连接失败: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[数据库] MongoDB 连接断开，尝试重连...');
});

mongoose.connection.on('error', (err) => {
  console.error(`[数据库] MongoDB 错误: ${err.message}`);
});

module.exports = connectDB;
