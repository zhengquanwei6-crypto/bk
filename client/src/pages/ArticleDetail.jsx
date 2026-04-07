import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { articleAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import { Heart, Eye, Clock, ArrowLeft, Edit, Trash2, Share2, BookOpen, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ArticleDetail() {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    articleAPI
      .getBySlug(slug)
      .then((res) => {
        setArticle(res.data);
        if (user) {
          setLiked(res.data.likes?.includes(user.id));
        }
      })
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false));
  }, [slug, user, navigate]);

  const handleLike = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await articleAPI.toggleLike(article._id);
      setLiked(res.data.isLiked);
      setArticle((prev) => ({ ...prev, likeCount: res.data.likeCount }));
    } catch {
      /* 静默 */
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;
    try {
      await articleAPI.delete(article._id);
      navigate('/');
    } catch {
      alert('删除失败');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: article.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 page-enter">
        <div className="h-5 w-24 skeleton rounded-full mb-6" />
        <div className="space-y-4 mb-8">
          <div className="flex gap-2">
            <div className="h-6 w-16 skeleton rounded-full" />
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
          <div className="h-10 w-4/5 skeleton" />
          <div className="h-10 w-3/5 skeleton" />
        </div>
        <div className="flex items-center gap-3 mb-10 pb-6 border-b border-gray-100">
          <div className="w-11 h-11 skeleton rounded-full" />
          <div className="space-y-2">
            <div className="h-4 w-24 skeleton" />
            <div className="h-3 w-36 skeleton" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-4 skeleton" style={{ width: `${60 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!article) return null;

  const isAuthor = user && (user.id === article.author?._id || user.role === 'admin');
  const date = article.createdAt ? format(new Date(article.createdAt), 'yyyy年MM月dd日') : '';

  return (
    <div className="page-enter">
      {/* 文章顶部封面区 */}
      <div className="bg-grid relative">
        <div className="glow-orb w-[400px] h-[400px] bg-primary-400/10 -top-32 right-0" />
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-12">
          <Link to="/articles" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 mb-8 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            返回文章列表
          </Link>

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-5">
            {article.tags?.map((tag) => (
              <Link key={tag} to={`/articles?tag=${tag}`} className="badge badge-primary hover:bg-primary-100 transition-colors">
                {tag}
              </Link>
            ))}
            {article.category && (
              <span className="badge bg-accent-50 text-accent-600 border border-accent-100">
                {article.category}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-8">
            {article.title}
          </h1>

          {/* 作者信息 & 操作栏 */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-primary-500/10">
                {article.author?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{article.author?.username}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={11} /> {date}</span>
                  <span className="flex items-center gap-1"><Eye size={11} /> {article.viewCount} 阅读</span>
                  <span className="flex items-center gap-1"><MessageCircle size={11} /> {article.commentCount || 0} 评论</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  liked
                    ? 'bg-red-50 border border-red-200 text-red-500 shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-400 hover:bg-red-50 shadow-soft'
                }`}
              >
                <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                {article.likeCount || 0}
              </button>
              <button onClick={handleShare} className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-primary-600 hover:border-primary-200 transition-all shadow-soft">
                <Share2 size={15} />
              </button>
              {isAuthor && (
                <>
                  <Link to={`/editor/${article._id}`} className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-soft">
                    <Edit size={15} />
                  </Link>
                  <button onClick={handleDelete} className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all shadow-soft">
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 文章正文 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <article className="card p-8 sm:p-12 prose prose-gray max-w-none prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-primary-50 prose-code:text-primary-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-img:rounded-xl prose-blockquote:border-l-primary-400 prose-blockquote:bg-primary-50/30 prose-blockquote:rounded-r-xl prose-blockquote:py-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </article>

        {/* 文章底部 */}
        <div className="flex items-center justify-between mt-8 mb-12">
          <div className="flex flex-wrap gap-2">
            {article.tags?.map((tag) => (
              <Link key={tag} to={`/articles?tag=${tag}`} className="badge badge-gray hover:badge-primary transition-all">
                #{tag}
              </Link>
            ))}
          </div>
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              liked
                ? 'bg-red-50 border border-red-200 text-red-500'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-400'
            }`}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            {liked ? '已点赞' : '点赞'} · {article.likeCount || 0}
          </button>
        </div>

        {/* 评论区 */}
        <div className="card p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <MessageCircle size={20} className="text-primary-500" />
            评论区
          </h3>
          <CommentSection articleId={article._id} />
        </div>
      </div>
    </div>
  );
}
