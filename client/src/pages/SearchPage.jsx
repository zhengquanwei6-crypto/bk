import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAPI } from '../api';
import ArticleCard from '../components/ArticleCard';
import { Search, Loader, SearchX } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searched, setSearched] = useState(false);

  const q = searchParams.get('q') || '';

  useEffect(() => {
    if (q) {
      setQuery(q);
      setLoading(true);
      setSearched(true);
      searchAPI
        .search({ q })
        .then((res) => setArticles(res.data || []))
        .catch(() => setArticles([]))
        .finally(() => setLoading(false));
    }
  }, [q]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  return (
    <div className="page-enter">
      {/* 搜索区 */}
      <div className="bg-grid relative overflow-hidden">
        <div className="glow-orb w-[500px] h-[500px] bg-primary-400/10 -top-48 left-1/4" />
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-14">
          <h1 className="text-3xl font-bold tracking-tight mb-2">搜索文章</h1>
          <p className="text-gray-400 text-sm mb-8">输入关键词搜索标题、内容或标签</p>

          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索文章..."
                className="w-full pl-14 pr-32 py-4 text-base bg-white border border-gray-200 rounded-2xl shadow-soft-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary btn-sm px-6">
                搜索
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader size={24} className="animate-spin mb-3 text-primary-400" />
            <p className="text-sm">正在搜索...</p>
          </div>
        ) : searched ? (
          articles.length > 0 ? (
            <div>
              <p className="text-sm text-gray-400 mb-6">
                找到 <span className="font-semibold text-primary-600">{articles.length}</span> 篇关于
                "<span className="font-medium text-gray-600">{q}</span>" 的文章
              </p>
              <div className="grid gap-5">
                {articles.map((article) => (
                  <ArticleCard key={article._id} article={article} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <SearchX size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium mb-2">未找到相关文章</p>
              <p className="text-sm text-gray-400">换个关键词试试吧</p>
            </div>
          )
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center mx-auto mb-5">
              <Search size={32} className="text-primary-400" />
            </div>
            <p className="text-gray-500 font-medium mb-1">探索技术世界</p>
            <p className="text-sm text-gray-400">输入关键词开始搜索</p>
          </div>
        )}
      </div>
    </div>
  );
}
