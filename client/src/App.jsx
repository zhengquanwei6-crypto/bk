import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import ArticleEditor from './pages/ArticleEditor';
import SearchPage from './pages/SearchPage';
import MyArticles from './pages/MyArticles';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

/**
 * 受保护路由 — 需要登录
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">加载中...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/**
 * 访客路由 — 已登录则跳转首页
 */
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">加载中...</div>;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* 公开路由 */}
            <Route path="/" element={<Home />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/article/:slug" element={<ArticleDetail />} />
            <Route path="/search" element={<SearchPage />} />

            {/* 访客路由 */}
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

            {/* 受保护路由 */}
            <Route path="/editor" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
            <Route path="/editor/:id" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
            <Route path="/my-articles" element={<ProtectedRoute><MyArticles /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <p className="text-6xl font-light text-gray-200 mb-4">404</p>
                <p className="text-gray-400 mb-6">页面不存在</p>
                <a href="/" className="btn-primary text-xs">返回首页</a>
              </div>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
