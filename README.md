# 饭搭子

基于 uni-app、Vue 3、TypeScript 与 Pinia 的跨端饮食推荐应用原型。

## 本地运行

```bash
pnpm install
pnpm dev:h5
```

微信小程序构建：

```bash
pnpm build:mp-weixin
```

构建结果位于 `dist/build/mp-weixin`，使用微信开发者工具导入即可预览。正式运行前需要在 `src/manifest.json` 中填写小程序 AppID。

## 当前页面

- 首页：完整视觉原型与交互
- 分类、计划、收藏、我的：可切换内容骨架
- 菜谱列表、菜谱详情、外卖推荐：辅助闭环页面
