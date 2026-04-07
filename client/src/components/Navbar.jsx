import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Menu, X, PenSquare, LogOut, User, Shield, ChevronDown, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/80 backdrop-blur-xl shadow-soft border-b border-gray-100/50'
        : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-105">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight leading-none">技术博客</span>
            <span className="text-[9px] text-gray-400 tracking-wider leading-none mt-0.5">TECH BLOG</span>
          </div>
        </Link>

        {/* 桌面端导航 */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { path: '/', label: '首页' },
            { path: '/articles', label: '文章' },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'text-primary-600 bg-primary-50 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* 搜索 */}
          <div className="ml-2">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center animate-fade-in">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索文章..."
                    className="w-52 pl-9 pr-3 py-2 text-sm bg-gray-100/80 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                    autoFocus
                  />
                </div>
                <button type="button" onClick={() => setSearchOpen(false)} className="p-1.5 ml-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <X size={15} />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100/60 transition-all">
                <Search size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 右侧操作区 */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/editor" className="btn-primary btn-sm flex items-center gap-1.5">
                <PenSquare size={13} />
                <span>写文章</span>
              </Link>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100/60 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xs font-semibold text-white shadow-sm">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-soft-xl py-2 z-20 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-sm font-medium truncate">{user?.username}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <User size={15} /> 个人中心
                      </Link>
                      <Link to="/my-articles" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <PenSquare size={15} /> 我的文章
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                          <Shield size={15} /> 管理后台
                        </Link>
                      )}
                      <hr className="my-1.5 border-gray-100" />
                      <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={15} /> 退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/60 transition-all">登录</Link>
              <Link to="/register" className="btn-primary btn-sm">注册</Link>
            </div>
          )}
        </div>

        {/* 移动端菜单按钮 */}
        <button className="md:hidden p-2 rounded-lg hover:bg-gray-100/60 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 移动端菜单 */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 py-5 space-y-1 animate-slide-in shadow-soft-lg">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文章..."
                className="input text-sm pl-10"
              />
            </div>
          </form>
          {[
            { path: '/', label: '首页' },
            { path: '/articles', label: '文章' },
          ].map((item) => (
            <Link key={item.path} to={item.path}
              className={`block py-2.5 px-3 text-sm rounded-lg transition-colors ${isActive(item.path) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link to="/editor" className="block py-2.5 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">写文章</Link>
              <Link to="/my-articles" className="block py-2.5 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">我的文章</Link>
              <Link to="/profile" className="block py-2.5 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">个人中心</Link>
              {isAdmin && <Link to="/admin" className="block py-2.5 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">管理后台</Link>}
              <hr className="my-2 border-gray-100" />
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left py-2.5 px-3 text-sm text-red-500 hover:bg-red-50 rounded-lg">退出登录</button>
            </>
          ) : (
            <div className="flex gap-2 pt-3">
              <Link to="/login" className="flex-1 btn-ghost btn-sm text-center">登录</Link>
              <Link to="/register" className="flex-1 btn-primary btn-sm text-center">注册</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
