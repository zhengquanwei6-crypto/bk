import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articleAPI } from '../api';
import MarkdownEditor from '../components/MarkdownEditor';
import { Save, Send, ArrowLeft, X, Image, Tag, FolderOpen, FileText } from 'lucide-react';

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    tags: [],
    category: '',
    status: 'draft',
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      articleAPI
        .getAll({ limit: 100 })
        .then((res) => {
          const article = res.data?.find((a) => a._id === id);
          if (article) {
            setForm({
              title: article.title || '',
              content: article.content || '',
              excerpt: article.excerpt || '',
              coverImage: article.coverImage || '',
              tags: article.tags || [],
              category: article.category || '',
              status: article.status || 'draft',
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleAddTag = (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 8) {
      setForm({ ...form, tags: [...form.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const handleSave = async (status = form.status) => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('标题和内容不能为空');
      return;
    }

    setSaving(true);
    try {
      const data = { ...form, status };
      if (isEdit) {
        await articleAPI.update(id, data);
      } else {
        await articleAPI.create(data);
      }
      navigate('/my-articles');
    } catch (err) {
      alert(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 page-enter">
        <div className="space-y-4">
          <div className="h-8 w-64 skeleton rounded-xl" />
          <div className="h-14 w-full skeleton rounded-xl" />
          <div className="h-96 w-full skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 page-enter">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          返回
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="btn btn-ghost btn-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            存为草稿
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="btn btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={14} />
            {isEdit ? '更新发布' : '发布文章'}
          </button>
        </div>
      </div>

      {/* 标题 */}
      <input
        type="text"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="输入文章标题..."
        className="w-full text-3xl font-bold tracking-tight border-none outline-none placeholder-gray-300 mb-8 bg-transparent"
        maxLength={120}
      />

      {/* 元信息卡片 */}
      <div className="card p-6 mb-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <FolderOpen size={14} className="text-gray-400" /> 分类
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="如：前端开发"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Image size={14} className="text-gray-400" /> 封面图片 URL
            </label>
            <input
              type="text"
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="input text-sm"
            />
          </div>
        </div>

        {/* 标签 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Tag size={14} className="text-gray-400" /> 标签
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            {form.tags.map((tag) => (
              <span key={tag} className="badge badge-primary flex items-center gap-1.5">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="text-primary-400 hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))}
            {form.tags.length === 0 && <span className="text-xs text-gray-400">还没有添加标签</span>}
          </div>
          <form onSubmit={handleAddTag} className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="输入标签后按回车"
              className="input text-sm flex-1"
              maxLength={20}
            />
            <button type="submit" className="btn btn-ghost btn-sm">添加</button>
          </form>
        </div>

        {/* 摘要 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <FileText size={14} className="text-gray-400" /> 摘要（可选）
          </label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="简短描述文章内容，留空将自动生成"
            className="input text-sm resize-none"
            rows={2}
            maxLength={300}
          />
        </div>
      </div>

      {/* Markdown 编辑器 */}
      <div className="mb-8">
        <label className="text-sm font-medium text-gray-700 mb-2 block">正文内容</label>
        <MarkdownEditor
          value={form.content}
          onChange={(content) => setForm({ ...form, content })}
          placeholder="使用 Markdown 语法开始写作..."
        />
      </div>
    </div>
  );
}
