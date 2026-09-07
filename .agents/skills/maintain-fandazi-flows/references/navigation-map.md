# Navigation map

## Main tabs

| Tab | Route | Selection |
|---|---|---|
| 首页 | `/pages/index/index` | 0 |
| 分类 | `/pages/category/category` | 1 |
| 计划 | `/pages/plan/plan` | 2 |
| 收藏 | `/pages/favorite/favorite` | 3 |
| 我的 | `/pages/user/user` | 4 |

## Subpages

| Concept | Route | Notes |
|---|---|---|
| 做饭推荐 | `/pages/recommend/recommend` | Personalized recommendation UI |
| 菜谱列表 | `/pages/recipe/list` | Reads category/source query parameters |
| 菜谱详情 | `/pages/recipe/detail?id=<id>` | Resolves IDs through recipe catalog |
| 计划详情 | `/pages/plan/detail` | Entered from plan meal headers |
| 外卖推荐 | `/pages/takeout/takeout` | May read takeout category |
| 登录 | `/pages/login/login` | Basic authentication entry |
| 身体状态 | `/pages/status/status` | Updates shared recommendation status |

## Key contracts

- Home “自己做/恢复期” → recommendation page.
- Home “查看更多” and cooking category cards → recipe list.
- Takeout categories → takeout page.
- Recipe cards → detail with a catalog-backed numeric ID.
- Detail/favorite actions → shared recipe store.
- Add-to-plan → shared planned IDs → visible plan meals.
