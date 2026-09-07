---
name: maintain-fandazi-flows
description: Maintain or diagnose 饭搭子 page routes, navigation, query parameters, custom TabBar behavior, Pinia state, favorites, cooked history, recommendations, and meal-plan synchronization. Use for “点不进去”, “跳错页面”, “新增路由”, “收藏不同步”, “加入计划没反应”, “检查全流程”, white-screen navigation regressions, or changes to `pages.json`, stores, and mocks. Do not trigger for visual-only spacing work.
---

# Maintain Fandazi Flows

## Workflow

1. Read [references/navigation-map.md], `frontend/src/pages.json`, the source handler, the destination page’s `onLoad`, and the relevant Pinia store.
2. Trace the complete path: user event → navigation API → registered route → query parsing → state mutation → return behavior.
3. Keep recommendation browsing, category recipe listing, and takeout flows separate.
4. Put cross-page state in Pinia. Persist user-facing state with stable storage keys where appropriate.
5. Update every producer and consumer when a state or route contract changes.
6. Check custom TabBar selection and subpage fallback behavior.
7. Add a loading, empty, and error behavior when the modified flow can have those states.
8. Run type-check, WeChat build, and the repository verifier.

## Navigation rules

- Use `switchTab` only for registered Tab pages.
- Use `navigateTo` for normal pages and `navigateBack` for normal return.
- Use a fallback redirect only when no usable page stack exists.
- Register every page in `frontend/src/pages.json` before navigating to it.
- Read and apply query parameters; do not append unused parameters.
- Avoid duplicate pages that represent the same product concept.

## State rules

- Keep favorites synchronized between recommendation, detail, and kitchen pages.
- Keep planned recipe IDs synchronized with the visible plan.
- Do not reuse conflicting recipe IDs for different dishes.
- Treat mocks as data sources, not independent page state.
- Preserve storage compatibility or explicitly migrate the storage key.

## Handoff

Describe the repaired flow, routes and stores changed, persistence impact, and tests run.
