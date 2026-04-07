import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Eye, Clock, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

const COVER_COLORS = [
  'from-primary-400 to-blue-500',
  'from-accent-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
];

export default function ArticleCard({ article }) {
  const date = article.createdAt ? format(new Date(article.createdAt), 'MM月dd日') : '';
  const colorIdx = (article.title?.length || 0) % COVER_COLORS.length;

  return (
    <article className="group card card-hover">
      <Link to={`/article/${article.slug}`} className="block p-5">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* 封面 */}
          {article.coverImage ? (
            <div className="sm:w-44 h-32 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
              <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          ) : (
            <div className={`sm:w-44 h-32 rounded-xl bg-gradient-to-br ${COVER_COLORS[colorIdx]} flex-shrink-0 flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-card-shine" />
              <span className="text-3xl text-white/80 font-serif font-bold">
                {article.title?.[0] || 'T'}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col">
            {/* 标签 */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {article.category && (
                <span className="badge badge-primary">{article.category}</span>
              )}
              {article.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="badge badge-gray">{tag}</span>
              ))}
            </div>

            {/* 标题 */}
            <h2 className="text-base font-semibold mb-1.5 group-hover:text-primary-600 transition-colors line-clamp-2 flex items-start gap-1">
              <span className="flex-1">{article.title}</span>
              <ArrowUpRight size={16} className="flex-shrink-0 mt-0.5 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-60 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
            </h2>

            {/* 摘要 */}
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-auto">
              {article.excerpt}
            </p>

            {/* 底部元信息 */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100/80">
              {article.author && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-[9px] font-bold text-white">
                    {article.author.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-600">{article.author.username}</span>
                </div>
              )}
              <div className="flex items-center gap-3 ml-auto text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {date}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {article.viewCount || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={12} /> {article.likeCount || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={12} /> {article.commentCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
