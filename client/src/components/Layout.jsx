import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Sparkles, Github, Heart } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            {/* 品牌 */}
            <div className="max-w-xs">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-semibold text-sm">技术博客</span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed">
                专注技术深度与写作质量的博客平台，让每一篇文章都有价值。
              </p>
            </div>

            {/* 链接 */}
            <div className="flex gap-16">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">导航</h4>
                <div className="space-y-2">
                  <Link to="/" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">首页</Link>
                  <Link to="/articles" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">文章</Link>
                  <Link to="/search" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">搜索</Link>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">账户</h4>
                <div className="space-y-2">
                  <Link to="/login" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">登录</Link>
                  <Link to="/register" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">注册</Link>
                  <Link to="/editor" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">写文章</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 底栏 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-gray-100 text-xs text-gray-400">
            <span>© 2025 技术博客 · 保留所有权利</span>
            <span className="flex items-center gap-1">
              用 <Heart size={11} className="text-red-400" /> 和代码打造
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
