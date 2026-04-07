const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_EXPIRE = '1d';
process.env.NODE_ENV = 'test';

const User = require('../src/models/User');
const Article = require('../src/models/Article');

let mongoServer;
let app;
let token;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  app = require('../src/app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Article.deleteMany({});

  // 创建测试用户并登录
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: '文章测试', email: 'article@test.com', password: 'password123' });
  token = res.body.data.token;
  userId = res.body.data.user.id;
});

describe('文章模块', () => {
  const testArticle = {
    title: '测试文章标题',
    content: '# 这是测试内容\n\n一些 Markdown 内容。',
    tags: ['JavaScript', '测试'],
    category: '前端开发',
    status: 'published',
  };

  describe('POST /api/articles', () => {
    it('应成功创建文章', async () => {
      const res = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(testArticle.title);
      expect(res.body.data.slug).toBeDefined();
      expect(res.body.data.tags).toEqual(testArticle.tags);
      expect(res.body.data.author._id || res.body.data.author).toBeDefined();
    });

    it('应自动生成摘要', async () => {
      const res = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle)
        .expect(201);

      expect(res.body.data.excerpt).toBeDefined();
      expect(res.body.data.excerpt.length).toBeGreaterThan(0);
    });

    it('应拒绝无标题文章', async () => {
      await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...testArticle, title: '' })
        .expect(400);
    });

    it('应拒绝未登录创建', async () => {
      await request(app)
        .post('/api/articles')
        .send(testArticle)
        .expect(401);
    });
  });

  describe('GET /api/articles', () => {
    beforeEach(async () => {
      // 创建多篇文章
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/articles')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...testArticle, title: `文章 ${i + 1}`, status: 'published' });
      }
    });

    it('应返回已发布文章列表', async () => {
      const res = await request(app)
        .get('/api/articles')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
    });

    it('应支持分页', async () => {
      const res = await request(app)
        .get('/api/articles?page=1&limit=2')
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.pages).toBe(2);
    });

    it('应支持标签筛选', async () => {
      const res = await request(app)
        .get('/api/articles?tag=JavaScript')
        .expect(200);

      expect(res.body.data.length).toBe(3);
    });

    it('不应返回草稿文章', async () => {
      await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...testArticle, title: '草稿文章', status: 'draft' });

      const res = await request(app).get('/api/articles').expect(200);
      expect(res.body.data.length).toBe(3); // 只有 3 篇 published
    });
  });

  describe('GET /api/articles/:slug', () => {
    it('应返回单篇文章并增加浏览量', async () => {
      const createRes = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle);

      const slug = createRes.body.data.slug;

      const res = await request(app)
        .get(`/api/articles/${slug}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(testArticle.title);
      expect(res.body.data.viewCount).toBe(1);
    });

    it('应返回 404 对不存在的文章', async () => {
      await request(app)
        .get('/api/articles/not-exist-slug')
        .expect(404);
    });
  });

  describe('PUT /api/articles/:id', () => {
    it('应成功更新文章', async () => {
      const createRes = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle);

      const id = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/articles/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '更新后的标题' })
        .expect(200);

      expect(res.body.data.title).toBe('更新后的标题');
    });

    it('应拒绝非作者编辑', async () => {
      const createRes = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle);

      // 创建另一个用户
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({ username: '其他用户', email: 'other@test.com', password: 'password123' });

      await request(app)
        .put(`/api/articles/${createRes.body.data._id}`)
        .set('Authorization', `Bearer ${otherRes.body.data.token}`)
        .send({ title: '恶意修改' })
        .expect(403);
    });
  });

  describe('DELETE /api/articles/:id', () => {
    it('应成功删除文章', async () => {
      const createRes = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle);

      await request(app)
        .delete(`/api/articles/${createRes.body.data._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 确认已删除
      const articles = await Article.find({});
      expect(articles.length).toBe(0);
    });
  });

  describe('PUT /api/articles/:id/like', () => {
    it('应成功点赞和取消点赞', async () => {
      const createRes = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${token}`)
        .send(testArticle);

      const id = createRes.body.data._id;

      // 点赞
      const likeRes = await request(app)
        .put(`/api/articles/${id}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(likeRes.body.data.isLiked).toBe(true);
      expect(likeRes.body.data.likeCount).toBe(1);

      // 取消点赞
      const unlikeRes = await request(app)
        .put(`/api/articles/${id}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(unlikeRes.body.data.isLiked).toBe(false);
      expect(unlikeRes.body.data.likeCount).toBe(0);
    });
  });
});
