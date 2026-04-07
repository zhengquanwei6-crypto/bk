import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Save, Lock, User, Image, FileText, Shield } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await authAPI.updateProfile(form);
      updateUser(res.data);
      setMsg('个人信息已更新');
    } catch (err) {
      setMsg(err.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) {
      setPwMsg('新密码至少 6 个字符');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    try {
      await authAPI.changePassword(pwForm);
      setPwMsg('密码已修改');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwMsg(err.message || '修改失败');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="bg-grid relative overflow-hidden">
        <div className="glow-orb w-[400px] h-[400px] bg-primary-400/10 -top-40 right-0" />
        <div className="max-w-xl mx-auto px-6 pt-10 pb-8">
          <h1 className="text-2xl font-bold tracking-tight">个人中心</h1>
          <p className="text-sm text-gray-400 mt-1">管理你的账户信息</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
        {/* 头像卡片 */}
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-500/20 flex-shrink-0">
              {form.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.username}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                user?.role === 'admin'
                  ? 'bg-primary-50 text-primary-600 border border-primary-100'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <Shield size={10} />
                {user?.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>
          </div>
        </div>

        {/* 基本信息表单 */}
        <form onSubmit={handleSave} className="card p-6">
          <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <User size={16} className="text-primary-500" />
            基本信息
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <FileText size={13} className="text-gray-400" /> 个人简介
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input text-sm resize-none"
                rows={3}
                maxLength={200}
                placeholder="简单介绍一下自己"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Image size={13} className="text-gray-400" /> 头像 URL
              </label>
              <input
                type="text"
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                className="input text-sm"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {msg && (
            <div className={`mt-4 px-3 py-2 rounded-lg text-sm ${
              msg.includes('失败') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {msg}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary btn-sm mt-5 flex items-center gap-1.5 disabled:opacity-50">
            <Save size={14} /> {saving ? '保存中...' : '保存修改'}
          </button>
        </form>

        {/* 修改密码 */}
        <form onSubmit={handlePassword} className="card p-6">
          <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <Lock size={16} className="text-primary-500" />
            修改密码
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">当前密码</label>
              <input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="input text-sm"
                placeholder="至少 6 个字符"
                required
                minLength={6}
              />
            </div>
          </div>

          {pwMsg && (
            <div className={`mt-4 px-3 py-2 rounded-lg text-sm ${
              pwMsg.includes('失败') || pwMsg.includes('至少') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {pwMsg}
            </div>
          )}

          <button type="submit" disabled={pwSaving} className="btn btn-ghost btn-sm mt-5 flex items-center gap-1.5 disabled:opacity-50">
            <Lock size={14} /> {pwSaving ? '修改中...' : '修改密码'}
          </button>
        </form>
      </div>
    </div>
  );
}
