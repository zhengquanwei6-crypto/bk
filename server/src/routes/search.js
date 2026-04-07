const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

/**
 * 搜索相关路由
 */

// 全文搜索
router.get('/', searchController.searchArticles);

// 搜索建议
router.get('/suggest', searchController.searchSuggest);

module.exports = router;
