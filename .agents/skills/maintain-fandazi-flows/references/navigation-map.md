# Navigation map

## Main tabs

| Tab | Route | Selection |
|---|---|---|
| 首页 | `/pages/index/index` | 0 |
| 分类 | `/pages/category/category` | 1 |
| 我的 | `/pages/user/user` | 2 |

## Subpages

| Concept | Route | Notes |
|---|---|---|
| 做饭推荐 | `/pages/recommend/recommend` | Personalized recommendation UI |
| 菜谱列表 | `/pages/recipe/list` | Reads category/source query parameters |
| 菜谱详情 | `/pages/recipe/detail?id=<id>` | Resolves IDs through recipe catalog |
| 计划 | `/pages/plan/plan` | Temporarily hidden; reserved for order-based plan generation |
| 计划详情 | `/pages/plan/detail` | Temporarily hidden with the plan entry |
| 外卖推荐 | `/pages/takeout/takeout` | May read takeout category |
| 登录 | `/pages/login/login` | Basic authentication entry |
| 身体状态 | `/pages/status/status` | Updates shared recommendation status |
| 收藏/厨房 | `/pages/favorite/favorite` | Entered from profile stats or “我的厨房” |

## Key contracts

- Home “自己做/恢复期” → recommendation page.
- Home “查看更多” and cooking category cards → recipe list.
- Takeout categories → takeout page.
- Recipe cards → detail with a catalog-backed numeric ID.
- Detail/favorite actions → shared recipe store.
- Manual add-to-plan entry points are temporarily hidden with the plan pages.
