import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 page-enter relative bg-grid">
      <div className="glow-orb w-[400px] h-[400px] bg-primary-400/15 -top-20 -left-20" />
      <div className="glow-orb w-[300px] h-[300px] bg-accent-400/10 bottom-20 -right-10" />

      <div className="w-full max-w-md relative">
        <div className="card p-8 sm:p-10">
          {/* 顶部装饰 */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Sparkles size={24} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1">欢迎回来</h1>
          <p className="text-sm text-gray-400 text-center mb-8">登录你的账户继续</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input pl-11"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-11"
                  placeholder="输入密码"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn btn-primary py-3 text-base disabled:opacity-50">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
                  登录中...
                </span>
              ) : (
                <span className="flex items-center gap-2">登录 <ArrowRight size={16} /></span>
              )}
            </button>
          </form>

          <p className="text-sm text-gray-400 text-center mt-6">
            还没有账户？{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
