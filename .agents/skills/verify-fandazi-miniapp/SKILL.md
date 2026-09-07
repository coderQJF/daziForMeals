---
name: verify-fandazi-miniapp
description: Run the 饭搭子 WeChat miniapp quality gate before delivery, commit, push, or after white-screen/build regressions. Use for “检查一下”, “白屏了”, “构建”, “准备提交/上传”, “最新代码”, “所有页面检查”, package-size or missing-image concerns. Runs deterministic checks for types, routes, assets, UI invariants, Git whitespace, and `build:mp-weixin`. Do not mutate product code while verifying.
---

# Verify Fandazi Miniapp

Run the deterministic verifier first:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/verify-fandazi-miniapp/scripts/verify-miniapp.ps1
```

Use `-SkipBuild` only for a quick intermediate check. Never use it for final delivery.

## Review workflow

1. Read [references/quality-gate.md].
2. Run the verifier and preserve complete error output.
3. Diagnose the first real failure before editing code. Tool deprecation warnings are not build failures.
4. If a fix is requested, make the narrowest correction and rerun the complete verifier.
5. Report pass/fail separately for types, assets, routes, UI invariants, diff check, and WeChat build.

## Boundaries

- Verification alone is read-only except for normal build output under `frontend/dist/`.
- Do not commit, push, upload, or delete files unless the user explicitly requests it.
- Do not include `frontend/ui/` in runtime source or claim it is packaged merely because it exists in the repository.
- Preserve the user’s dirty worktree and report unrelated failures distinctly.
