import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { articleAPI } from '../api';
import ArticleCard from '../components/ArticleCard';
import { SlidersHorizontal, ChevronLeft, ChevronRight, X, BookOpen } from 'lucide-react';

export default function Articles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const currentTag = searchParams.get('tag') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || 'latest';
  const currentPage = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    setLoading(true);
    const params = { page: currentPage, limit: 10, sort: currentSort };
    if (currentTag) params.tag = currentTag;
    if (currentCategory) params.category = currentCategory;

    articleAPI
      .getAll(params)
      .then((res) => {
        setArticles(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentTag, currentCategory, currentSort, currentPage]);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const sortOptions = [
    { value: 'latest', label: '最新发布' },
    { value: 'popular', label: '最多浏览' },
    { value: 'mostLiked', label: '最多点赞' },
  ];

  return (
    <div className="page-enter">
      {/* 页头 */}
      <div className="bg-grid relative overflow-hidden">
        <div className="glow-orb w-[400px] h-[400px] bg-primary-400/10 -top-40 -right-20" />
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">全部文章</h1>
          <p className="text-sm text-gray-400">
            共 <span className="font-medium text-gray-600">{pagination.total}</span> 篇文章
            {currentTag && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">
                标签: {currentTag}
                <button onClick={() => setParam('tag', '')} className="hover:text-primary-800"><X size={12} /></button>
              </span>
            )}
            {currentCategory && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-accent-50 text-accent-600 rounded-full text-xs">
                分类: {currentCategory}
                <button onClick={() => setParam('category', '')} className="hover:text-accent-800"><X size={12} /></button>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 筛选栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-soft">
            <SlidersHorizontal size={14} className="text-gray-400 mx-2" />
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setParam('sort', opt.value)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  currentSort === opt.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(currentTag || currentCategory) && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <X size={13} /> 清除全部筛选
            </button>
          )}
        </div>

        {/* 文章列表 */}
        {loading ? (
          <div className="grid gap-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card p-5">
                <div className="flex gap-5">
                  <div className="w-44 h-32 skeleton rounded-xl flex-shrink-0 hidden sm:block" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="flex gap-2">
                      <div className="h-5 w-14 skeleton rounded-full" />
                      <div className="h-5 w-14 skeleton rounded-full" />
                    </div>
                    <div className="h-5 w-4/5 skeleton" />
                    <div className="h-4 w-full skeleton" />
                    <div className="h-3 w-1/3 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid gap-5">
            {articles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        ) : (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-2">暂无文章</p>
            <p className="text-sm text-gray-400">调整筛选条件或浏览其他内容</p>
          </div>
        )}

        {/* 分页 */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-12">
            <button
              onClick={() => setParam('page', Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-primary-600 hover:border-primary-200 disabled:opacity-30 transition-all shadow-soft"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) < 3 || p === 1 || p === pagination.pages)
              .map((p, i, arr) => (
                <span key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-gray-300">...</span>}
                  <button
                    onClick={() => setParam('page', p)}
                    className={`w-10 h-10 text-sm font-medium rounded-xl transition-all duration-200 ${
                      p === currentPage
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                        : 'border border-gray-200 text-gray-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 shadow-soft'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setParam('page', Math.min(pagination.pages, currentPage + 1))}
              disabled={currentPage >= pagination.pages}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-primary-600 hover:border-primary-200 disabled:opacity-30 transition-all shadow-soft"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
