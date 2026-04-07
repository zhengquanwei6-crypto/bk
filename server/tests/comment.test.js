const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_EXPIRE = '1d';
process.env.NODE_ENV = 'test';

const User = require('../src/models/User');
const Article = require('../src/models/Article');
const Comment = require('../src/models/Comment');

let mongoServer;
let app;
let token;
let articleId;

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
  await Comment.deleteMany({});

  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ username: '评论测试', email: 'comment@test.com', password: 'password123' });
  token = userRes.body.data.token;

  const articleRes = await request(app)
    .post('/api/articles')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: '测试文章', content: '测试内容', status: 'published' });
  articleId = articleRes.body.data._id;
});

describe('评论模块', () => {
  describe('POST /api/comments', () => {
    it('应成功发表评论', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '这是一条测试评论', articleId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('这是一条测试评论');
      expect(res.body.data.author).toBeDefined();
    });

    it('应成功回复评论', async () => {
      const commentRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '父评论', articleId });

      const parentId = commentRes.body.data._id;

      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '回复评论', articleId, parentCommentId: parentId })
        .expect(201);

      expect(res.body.data.parentComment).toBe(parentId);
    });

    it('应拒绝空内容', async () => {
      await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '', articleId })
        .expect(400);
    });

    it('应拒绝未登录', async () => {
      await request(app)
        .post('/api/comments')
        .send({ content: '未登录评论', articleId })
        .expect(401);
    });
  });

  describe('GET /api/comments/article/:articleId', () => {
    it('应返回文章评论列表', async () => {
      await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '评论 1', articleId });

      await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '评论 2', articleId });

      const res = await request(app)
        .get(`/api/comments/article/${articleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('应包含嵌套回复', async () => {
      const parentRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '父评论', articleId });

      await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '子回复', articleId, parentCommentId: parentRes.body.data._id });

      const res = await request(app)
        .get(`/api/comments/article/${articleId}`)
        .expect(200);

      expect(res.body.data.length).toBe(1); // 只有顶级评论
      expect(res.body.data[0].replies.length).toBe(1);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('应软删除评论', async () => {
      const commentRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '将被删除', articleId });

      await request(app)
        .delete(`/api/comments/${commentRes.body.data._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const comment = await Comment.findById(commentRes.body.data._id);
      expect(comment.isDeleted).toBe(true);
    });
  });

  describe('PUT /api/comments/:id/like', () => {
    it('应成功点赞评论', async () => {
      const commentRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '可点赞评论', articleId });

      const res = await request(app)
        .put(`/api/comments/${commentRes.body.data._id}/like`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.isLiked).toBe(true);
      expect(res.body.data.likeCount).toBe(1);
    });
  });
});
