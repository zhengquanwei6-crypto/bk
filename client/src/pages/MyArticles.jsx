import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../api';
import { Edit, Trash2, Eye, PenSquare, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function MyArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = {};
    if (filter) params.status = filter;
    articleAPI
      .getMine(params)
      .then((res) => setArticles(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await articleAPI.delete(id);
      setArticles((prev) => prev.filter((a) => a._id !== id));
    } catch {
      alert('删除失败');
    }
  };

  const statusMap = {
    draft: { label: '草稿', color: 'bg-amber-50 text-amber-600 border border-amber-100' },
    published: { label: '已发布', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
    archived: { label: '已归档', color: 'bg-gray-100 text-gray-500 border border-gray-200' },
  };

  return (
    <div className="page-enter">
      <div className="bg-grid relative overflow-hidden">
        <div className="glow-orb w-[400px] h-[400px] bg-primary-400/10 -top-40 -left-20" />
        <div className="max-w-4xl mx-auto px-6 pt-10 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">我的文章</h1>
              <p className="text-sm text-gray-400 mt-1">共 {articles.length} 篇文章</p>
            </div>
            <Link to="/editor" className="btn btn-primary btn-sm flex items-center gap-1.5">
              <PenSquare size={14} /> 写文章
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 状态筛选 */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-soft mb-8 w-fit">
          {[
            { value: '', label: '全部' },
            { value: 'published', label: '已发布' },
            { value: 'draft', label: '草稿' },
            { value: 'archived', label: '已归档' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                filter === opt.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 h-20 skeleton" />
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article) => (
              <div key={article._id} className="card card-hover p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${statusMap[article.status]?.color}`}>
                      {statusMap[article.status]?.label}
                    </span>
                    {article.isTop && <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-primary-50 text-primary-600 border border-primary-100">置顶</span>}
                  </div>
                  <h3 className="text-sm font-semibold truncate">{article.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                    <span className="flex items-center gap-1"><Clock size={11} /> {article.updatedAt ? format(new Date(article.updatedAt), 'MM-dd HH:mm') : ''}</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {article.viewCount || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/editor/${article._id}`}
                    className="p-2.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                    title="编辑"
                  >
                    <Edit size={15} />
                  </Link>
                  <button
                    onClick={() => handleDelete(article._id)}
                    className="p-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="删除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-2">还没有文章</p>
            <p className="text-sm text-gray-400 mb-6">开始创作你的第一篇技术文章</p>
            <Link to="/editor" className="btn btn-primary btn-sm">写第一篇</Link>
          </div>
        )}
      </div>
    </div>
  );
}
