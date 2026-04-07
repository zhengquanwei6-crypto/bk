import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3, Heading1, Heading2, Heading3, Bold, Italic, Strikethrough, Link2, ImageIcon, Code, Braces, Quote, List, Table } from 'lucide-react';

/**
 * Markdown 编辑器组件
 * 支持实时预览、工具栏快捷操作
 */
export default function MarkdownEditor({ value, onChange, placeholder = '开始写作...' }) {
  const [preview, setPreview] = useState(false);

  const insertText = (before, after = '') => {
    const textarea = document.getElementById('md-editor');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const newText = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const toolbar = [
    { icon: <Heading1 size={15} />, action: () => insertText('# '), tip: '一级标题' },
    { icon: <Heading2 size={15} />, action: () => insertText('## '), tip: '二级标题' },
    { icon: <Heading3 size={15} />, action: () => insertText('### '), tip: '三级标题' },
    { sep: true },
    { icon: <Bold size={15} />, action: () => insertText('**', '**'), tip: '加粗' },
    { icon: <Italic size={15} />, action: () => insertText('*', '*'), tip: '斜体' },
    { icon: <Strikethrough size={15} />, action: () => insertText('~~', '~~'), tip: '删除线' },
    { sep: true },
    { icon: <Link2 size={15} />, action: () => insertText('[', '](url)'), tip: '链接' },
    { icon: <ImageIcon size={15} />, action: () => insertText('![alt](', ')'), tip: '图片' },
    { icon: <Code size={15} />, action: () => insertText('`', '`'), tip: '行内代码' },
    { icon: <Braces size={15} />, action: () => insertText('\n```\n', '\n```\n'), tip: '代码块' },
    { sep: true },
    { icon: <Quote size={15} />, action: () => insertText('> '), tip: '引用' },
    { icon: <List size={15} />, action: () => insertText('- '), tip: '列表' },
    { icon: <Table size={15} />, action: () => insertText('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'), tip: '表格' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 bg-gray-50/80">
        <div className="flex items-center gap-0.5 flex-wrap">
          {toolbar.map((item, i) =>
            item.sep ? (
              <div key={i} className="w-px h-5 bg-gray-200 mx-1.5" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={item.action}
                title={item.tip}
                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
              >
                {item.icon}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            preview
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
        >
          {preview ? <Edit3 size={13} /> : <Eye size={13} />}
          {preview ? '编辑' : '预览'}
        </button>
      </div>

      {/* 编辑/预览区域 */}
      {preview ? (
        <div className="p-6 sm:p-8 min-h-[400px] prose prose-gray max-w-none prose-sm prose-headings:font-bold prose-a:text-primary-600 prose-code:bg-primary-50 prose-code:text-primary-700 prose-code:rounded-md prose-pre:bg-gray-900 prose-pre:rounded-xl prose-blockquote:border-l-primary-400">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">暂无内容</p>
          )}
        </div>
      ) : (
        <textarea
          id="md-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="md-editor w-full min-h-[400px] p-6 sm:p-8 focus:outline-none resize-y bg-white text-sm leading-relaxed font-mono"
          spellCheck={false}
        />
      )}

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/80 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Markdown
        </span>
        <span>{value.length} 字符</span>
      </div>
    </div>
  );
}
