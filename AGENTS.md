# 饭搭子项目维护规则

## 项目边界

- 使用 uni-app、Vue 3、TypeScript 和 Pinia；当前主要交付目标是微信小程序，同时保持 App 扩展能力。
- 将 `frontend/ui/` 视为设计源文件目录。运行时代码只能引用 `frontend/src/static/` 中的资源，禁止引用 `frontend/ui/`。
- 保留用户已有的未提交修改。修改前查看 `git status --short`，不要覆盖无关改动。

## UI 与组件

- 优先复用 `frontend/src/components/AppHeader.vue`、`frontend/src/components/AppTabBar.vue` 和 `frontend/src/styles/tokens.scss`。
- 微信自定义导航必须通过 `AppHeader` 适配胶囊位置，不得重新写死胶囊右侧间距。
- 当前主 Tab 为：首页、分类、我的。计划页暂时隐藏并保留路由，后续改为根据每日下单菜品生成；收藏/厨房保留为从“我的”进入的普通子页面。微信端使用 `frontend/src/custom-tab-bar/`。
- 使用 `#FF900B` 主色和 `#FFF7ED` 页面底色；新增颜色先判断是否应加入 tokens。
- 正常辅助文字不得小于 `24rpx`；更小字号仅允许用于无法放大的装饰性标记，并需验证真机可读性。
- 优先修正布局、容器和资源裁切问题，不用额外空白强行拉长页面。

## 路由与状态

- Tab 页面使用 `uni.switchTab`；普通页面使用 `uni.navigateTo`；返回优先使用 `uni.navigateBack`。
- 做饭推荐页和普通菜谱浏览页必须保持独立：`pages/recommend/recommend` 与 `pages/recipe/list` 不得合并。
- 收藏、推荐、做过和加入计划等跨页面数据必须通过 Pinia Store 管理，不得在多个页面各自维护冲突副本。
- 新增或修改路由时同步检查 `frontend/src/pages.json`、所有入口、参数读取、返回路径和自定义 TabBar。

## 交付验证

- 修改代码后至少在仓库根目录运行 `pnpm type-check`。
- 页面、路由、样式或资源变更后在仓库根目录运行 `pnpm build:frontend`。
- 交付前运行 `.agents/skills/verify-fandazi-miniapp/scripts/verify-miniapp.ps1`。
- 不提交 `frontend/dist/`，除非用户明确要求提交构建产物。
