import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, articleAPI } from '../api';
import { Users, FileText, Shield, ToggleLeft, ToggleRight, Trash2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export default function Admin() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('articles');
  const [users, setUsers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'users') {
      authAPI.getUsers({ limit: 50 })
        .then((res) => setUsers(res.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      articleAPI.getAll({ limit: 50 })
        .then((res) => setArticles(res.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const toggleUser = async (id) => {
    try {
      const res = await authAPI.toggleUser(id);
      setUsers((prev) => prev.map((u) => (u._id === id ? res.data : u)));
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteArticle = async (id) => {
    if (!confirm('确定删除该文章？')) return;
    try {
      await articleAPI.delete(id);
      setArticles((prev) => prev.filter((a) => a._id !== id));
    } catch {
      alert('删除失败');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center page-enter">
        <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={36} className="text-red-300" />
        </div>
        <h1 className="text-xl font-bold mb-2">无权访问</h1>
        <p className="text-sm text-gray-400">此页面仅管理员可见</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="bg-grid relative overflow-hidden">
        <div className="glow-orb w-[400px] h-[400px] bg-primary-400/10 -top-40 -right-20" />
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md shadow-primary-500/20">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
              <p className="text-sm text-gray-400">管理用户和文章内容</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab 切换 */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-soft mb-8 w-fit">
          <button
            onClick={() => setTab('articles')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              tab === 'articles' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <FileText size={14} /> 文章管理
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              tab === 'users' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Users size={14} /> 用户管理
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
          </div>
        ) : tab === 'articles' ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500">
                    <th className="px-5 py-3.5">标题</th>
                    <th className="px-5 py-3.5">作者</th>
                    <th className="px-5 py-3.5">状态</th>
                    <th className="px-5 py-3.5">浏览</th>
                    <th className="px-5 py-3.5">日期</th>
                    <th className="px-5 py-3.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articles.map((a) => (
                    <tr key={a._id} className="hover:bg-primary-50/30 transition-colors">
                      <td className="px-5 py-3.5 max-w-xs truncate font-medium">{a.title}</td>
                      <td className="px-5 py-3.5 text-gray-500">{a.author?.username}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                          a.status === 'published' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          a.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {a.status === 'published' ? '已发布' : a.status === 'draft' ? '草稿' : '归档'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">{a.viewCount}</td>
                      <td className="px-5 py-3.5 text-gray-400">{a.createdAt ? format(new Date(a.createdAt), 'MM-dd') : ''}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => deleteArticle(a._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {articles.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">暂无文章</p>}
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500">
                    <th className="px-5 py-3.5">用户名</th>
                    <th className="px-5 py-3.5">邮箱</th>
                    <th className="px-5 py-3.5">角色</th>
                    <th className="px-5 py-3.5">状态</th>
                    <th className="px-5 py-3.5">注册时间</th>
                    <th className="px-5 py-3.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-primary-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-[10px] font-bold text-white">
                            {u.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-primary-50 text-primary-600 border border-primary-100' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {u.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                          u.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {u.isActive ? '正常' : '禁用'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">{u.createdAt ? format(new Date(u.createdAt), 'yyyy-MM-dd') : ''}</td>
                      <td className="px-5 py-3.5">
                        {u.role !== 'admin' && (
                          <button onClick={() => toggleUser(u._id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all" title={u.isActive ? '禁用' : '启用'}>
                            {u.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">暂无用户</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
