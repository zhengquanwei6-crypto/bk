const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 设置测试环境变量
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_EXPIRE = '1d';
process.env.NODE_ENV = 'test';

const User = require('../src/models/User');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  app = require('../src/app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('用户认证模块', () => {
  const testUser = {
    username: '测试用户',
    email: 'test@example.com',
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('应成功注册新用户', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe(testUser.username);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.role).toBe('user');
    });

    it('应拒绝重复邮箱注册', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('应拒绝无效邮箱', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('应拒绝过短密码', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, password: '123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('应成功登录', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('应拒绝错误密码', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('应拒绝不存在的邮箱', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notexist@example.com', password: 'password123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应返回当前用户信息', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      const token = registerRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('应拒绝无 token 请求', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('应拒绝无效 token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('应成功更新个人信息', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      const token = registerRes.body.data.token;

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: '这是我的简介' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.bio).toBe('这是我的简介');
    });
  });

  describe('PUT /api/auth/password', () => {
    it('应成功修改密码', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      const token = registerRes.body.data.token;

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpass456' })
        .expect(200);

      expect(res.body.success).toBe(true);

      // 用新密码登录
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpass456' })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
    });

    it('应拒绝错误的当前密码', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      const token = registerRes.body.data.token;

      await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass456' })
        .expect(400);
    });
  });
});
