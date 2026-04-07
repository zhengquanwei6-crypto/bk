import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { commentAPI } from '../api';
import { Heart, Reply, Trash2, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function CommentSection({ articleId }) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await commentAPI.getByArticle(articleId);
      setComments(res.data);
    } catch {
      /* 静默 */
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await commentAPI.create({
        content: content.trim(),
        articleId,
        parentCommentId: replyTo || undefined,
      });
      setContent('');
      setReplyTo(null);
      fetchComments();
    } catch {
      alert('评论发表失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId) => {
    if (!isAuthenticated) return;
    try {
      const res = await commentAPI.toggleLike(commentId);
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, likeCount: res.data.likeCount, isLiked: res.data.isLiked }
            : {
                ...c,
                replies: c.replies?.map((r) =>
                  r._id === commentId
                    ? { ...r, likeCount: res.data.likeCount, isLiked: res.data.isLiked }
                    : r
                ),
              }
        )
      );
    } catch {
      /* 静默 */
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await commentAPI.delete(commentId);
      fetchComments();
    } catch {
      alert('删除失败');
    }
  };

  const CommentItem = ({ comment, isReply = false }) => (
    <div className={`${isReply ? 'ml-12 pl-5 border-l-2 border-primary-100' : ''} py-5`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isReply
            ? 'bg-gray-100 text-gray-500'
            : 'bg-gradient-to-br from-primary-400 to-accent-400 text-white'
        }`}>
          {comment.author?.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold">{comment.author?.username}</span>
            <span className="text-[11px] text-gray-400">
              {comment.createdAt ? format(new Date(comment.createdAt), 'MM-dd HH:mm') : ''}
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <button
              onClick={() => handleLike(comment._id)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${
                comment.isLiked
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
              }`}
            >
              <Heart size={13} fill={comment.isLiked ? 'currentColor' : 'none'} />
              {comment.likeCount || 0}
            </button>
            {isAuthenticated && !isReply && (
              <button
                onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${
                  replyTo === comment._id
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'
                }`}
              >
                <Reply size={13} />
                回复
              </button>
            )}
            {(user?.id === comment.author?._id || user?.role === 'admin') && (
              <button
                onClick={() => handleDelete(comment._id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-all"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 回复输入框 */}
      {replyTo === comment._id && (
        <form onSubmit={handleSubmit} className="ml-12 mt-3 flex gap-2 animate-fade-in">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`回复 ${comment.author?.username}...`}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
            autoFocus
          />
          <button type="submit" disabled={submitting} className="btn btn-primary btn-sm px-4 disabled:opacity-50">
            <Send size={14} />
          </button>
        </form>
      )}

      {/* 子评论 */}
      {comment.replies?.map((reply) => (
        <CommentItem key={reply._id} comment={reply} isReply />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-9 h-9 rounded-full skeleton" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-28 skeleton" />
              <div className="h-4 w-full skeleton" />
              <div className="h-4 w-2/3 skeleton" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 评论输入 */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={replyTo ? '' : content}
                onChange={(e) => { if (!replyTo) setContent(e.target.value); }}
                placeholder="写下你的评论..."
                rows={3}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || (!content.trim() && !replyTo)}
                  className="btn btn-primary btn-sm disabled:opacity-50"
                >
                  <Send size={14} />
                  发表评论
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <MessageSquare size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">
            请 <a href="/login" className="text-primary-600 font-medium hover:underline">登录</a> 后发表评论
          </p>
        </div>
      )}

      {/* 评论列表 */}
      <div className="divide-y divide-gray-100">
        {comments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">暂无评论，来写第一条吧</p>
          </div>
        ) : (
          comments.map((comment) => <CommentItem key={comment._id} comment={comment} />)
        )}
      </div>
    </div>
  );
}
