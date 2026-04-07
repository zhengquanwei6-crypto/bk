# Luxury Confession SPA Template

一个可复用的高端单页告白模板（纯静态站点，无构建步骤）。

## 快速自定义

编辑 `scripts/template-config.js`：

```js
window.CONFESSION_TEMPLATE = {
  senderName: "你的名字",
  recipientName: "TA的名字",
  relationLabel: "我们",
  anniversaryMonth: 12,
  anniversaryDay: 24,
  exportFileName: "confession-template-letter.txt",
};
```

## 直接预览

- 直接双击 `index.html` 即可。
- 页面已改为非 module 脚本加载，`file://` 场景可运行。

## 项目结构

- `index.html`：单页结构
- `styles/main.css`：视觉与动画
- `scripts/template-config.js`：可编辑配置
- `scripts/love-notes.js`：大体量模板文案库
- `scripts/app.js`：交互逻辑

## 部署到 GitHub Pages

1. 创建 GitHub 仓库（空仓库）
2. 在本项目目录执行：

```bash
git init
git add .
git commit -m "feat: universal premium confession one-page template"
git branch -M main
git remote add origin <你的仓库URL>
git push -u origin main
```

3. 在仓库设置中开启 Pages：

- Source: `Deploy from a branch`
- Branch: `main` / `/ (root)`

完成后即可通过 Pages 链接访问。
