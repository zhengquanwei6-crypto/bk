import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../api';
import ArticleCard from '../components/ArticleCard';
import { ArrowRight, TrendingUp, Code2, Zap, BookOpen } from 'lucide-react';

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      articleAPI.getAll({ limit: 8, sort: 'latest' }),
      articleAPI.getTags(),
    ])
      .then(([articlesRes, tagsRes]) => {
        setArticles(articlesRes.data || []);
        setTags(tagsRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter">
      {/* Hero 区域 */}
      <section className="relative overflow-hidden bg-grid">
        {/* 装饰光晕 */}
        <div className="glow-orb w-[500px] h-[500px] bg-primary-400/20 -top-48 -right-24" />
        <div className="glow-orb w-[400px] h-[400px] bg-accent-400/15 top-20 -left-32" />
        <div className="glow-orb w-[300px] h-[300px] bg-blue-400/10 bottom-0 right-1/3" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full border border-primary-100 text-xs text-primary-600 font-medium mb-6 animate-fade-up">
                <Zap size={12} />
                <span>高性能技术博客平台</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight mb-6 leading-[1.15]">
                记录技术，
                <br />
                <span className="text-gradient">分享思考</span>
              </h1>

              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
                一个专注于技术深度与写作质量的博客平台。在这里，每一篇文章都值得被认真阅读。
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/articles" className="btn btn-primary">
                  <span>浏览文章</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/register" className="btn btn-ghost">开始写作</Link>
              </div>

              {/* 统计数字 */}
              <div className="flex items-center gap-8 mt-12 pt-8 border-t border-gray-200/50">
                {[
                  { icon: BookOpen, num: articles.length || '0', label: '篇文章' },
                  { icon: Code2, num: tags.length || '0', label: '个标签' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <stat.icon size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{stat.num}</p>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧装饰卡片 */}
            <div className="hidden lg:block flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-3xl blur-2xl transform rotate-3" />
                <div className="relative card p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-auto text-xs text-gray-400 font-mono">blog.jsx</span>
                  </div>
                  <div className="space-y-3 font-mono text-sm">
                    <p><span className="text-purple-500">const</span> <span className="text-blue-500">blog</span> = {'{'}</p>
                    <p className="pl-4"><span className="text-gray-500">title:</span> <span className="text-green-600">"技术博客"</span>,</p>
                    <p className="pl-4"><span className="text-gray-500">stack:</span> <span className="text-green-600">"React + Express"</span>,</p>
                    <p className="pl-4"><span className="text-gray-500">features:</span> [</p>
                    <p className="pl-8"><span className="text-green-600">"Markdown"</span>,</p>
                    <p className="pl-8"><span className="text-green-600">"全文搜索"</span>,</p>
                    <p className="pl-8"><span className="text-green-600">"评论互动"</span></p>
                    <p className="pl-4">]</p>
                    <p>{'}'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 文章区域 */}
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* 文章列表 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">最新文章</h2>
                <p className="text-sm text-gray-400 mt-1">发现最新的技术分享</p>
              </div>
              <Link to="/articles" className="btn-ghost btn-sm flex items-center gap-1.5">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card p-5">
                    <div className="flex gap-5">
                      <div className="w-40 h-28 skeleton flex-shrink-0 rounded-xl" />
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
                <p className="text-sm text-gray-400 mb-6">成为第一个发布文章的人</p>
                <Link to="/editor" className="btn btn-primary btn-sm">发布第一篇</Link>
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <aside className="lg:w-72 flex-shrink-0 space-y-6">
            {/* 热门标签 */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-500" />
                热门标签
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 15).map((tag) => (
                  <Link
                    key={tag._id}
                    to={`/articles?tag=${tag._id}`}
                    className="badge badge-gray hover:badge-primary transition-all duration-200 cursor-pointer"
                  >
                    {tag._id}
                    <span className="ml-1 opacity-50">{tag.count}</span>
                  </Link>
                ))}
                {tags.length === 0 && !loading && (
                  <p className="text-xs text-gray-400">暂无标签</p>
                )}
              </div>
            </div>

            {/* 关于 */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold mb-3">关于平台</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                使用 React + Express + MongoDB 构建的技术博客系统。
                支持 Markdown 编辑、全文搜索、评论互动等功能。
              </p>
              <div className="flex gap-2 mt-4">
                {['React', 'Express', 'MongoDB'].map((tech) => (
                  <span key={tech} className="badge badge-primary text-[10px]">{tech}</span>
                ))}
              </div>
            </div>

            {/* 开始写作 CTA */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 p-6 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <h3 className="font-semibold mb-2">开始你的写作之旅</h3>
                <p className="text-sm text-white/70 mb-4 leading-relaxed">分享你的技术见解，与社区一起成长。</p>
                <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary-600 text-sm font-medium rounded-lg hover:bg-white/90 transition-colors">
                  立即开始 <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
