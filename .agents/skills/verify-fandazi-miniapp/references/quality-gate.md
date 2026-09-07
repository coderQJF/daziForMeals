# Quality gate

The complete gate checks:

1. `pnpm type-check` succeeds from the repository root.
2. Every `/static/...` source reference exists below `frontend/src/static`.
3. Runtime source does not reference `frontend/ui/`.
4. Every literal `/pages/...` navigation target is registered in `frontend/src/pages.json`.
5. No legacy `margin-right: 178rpx` capsule workaround remains.
6. No ordinary CSS `font-size` below `24rpx` remains.
7. `git diff --check` succeeds.
8. The frontend `build:mp-weixin` script succeeds.
9. `frontend/dist/build/mp-weixin` exists after the build.

Warnings from the Sass legacy JS API or an available uni-app update do not fail the gate when the compiler finishes successfully.
