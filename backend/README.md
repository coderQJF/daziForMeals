# 饭搭子 Node.js 后端

基于 Node.js、TypeScript 与 Fastify 的 API 服务，要求 Node.js 20 或更高版本。

## 本地开发

在仓库根目录执行：

```bash
pnpm install
pnpm dev:backend
```

默认监听 `http://127.0.0.1:3000`，接口包括：

- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1`

## 检查与构建

```bash
pnpm verify:backend
pnpm build:backend
```

## ECS Docker 部署

首次部署时：

1. 将 `.env.example` 复制为 `.env`，按生产环境修改。
2. 将 `deploy/nginx-api.conf.example` 安装为 Nginx 站点配置；生产环境示例将宿主机 `3100` 端口反向代理到 API。
3. 为 `fandazi-api.coder-f-nowork.cn` 配置 HTTPS 证书。
4. 在仓库根目录执行 `pnpm deploy:backend`。

常用运维命令：

```bash
pnpm logs:backend
pnpm stop:backend
curl http://127.0.0.1:3000/health
```

Compose 默认只将 API 绑定到服务器回环地址，由 Nginx 对公网提供 HTTPS，不直接暴露 3000 端口。
