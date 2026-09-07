# 饭搭子

饭搭子采用前后端分目录的工作区结构：

```text
daziForMeals/
├─ frontend/   # uni-app 微信小程序、H5 与设计源文件
├─ backend/    # 后端服务（待确定技术栈）
├─ .agents/    # 跟随项目的 AI 维护规则与质量门禁
└─ package.json
```

## 常用命令

在仓库根目录执行：

```bash
pnpm install
pnpm dev:frontend
pnpm dev:h5
pnpm dev:backend
pnpm type-check
pnpm build:frontend
pnpm build:backend
pnpm verify:frontend
pnpm verify:backend
pnpm verify
```

项目固定使用 pnpm 11.19.0；建议启用 Node.js 自带的 Corepack，避免不同 pnpm store 版本混用。

`pnpm deploy:frontend` 当前执行完整前端质量门禁并生成微信小程序生产包，后续接入微信 CI 上传时只需扩展这一稳定入口。

构建结果位于 `frontend/dist/build/mp-weixin`，使用微信开发者工具导入即可预览。正式运行前需要在 `frontend/src/manifest.json` 中填写小程序 AppID。

## 部署边界

- 前端部署入口：根目录 `pnpm deploy:frontend`
- 图片资源：`https://img.coder-f-nowork.cn`
- 后端：Node.js、TypeScript、Fastify，位于 `backend/`
- 后端 Docker 部署入口：根目录 `pnpm deploy:backend`
- 后端域名：`https://api.coder-f-nowork.cn`
- 前端通过 `VITE_API_BASE_URL` 切换 API 环境
