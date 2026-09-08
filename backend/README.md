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
- `GET /api/v1/bootstrap?status=recover&offset=0`
- `GET /api/v1/recipes?category=soup&q=汤&status=recover&sort=default&limit=20`
- `GET /api/v1/recipes/:id`

未设置 `DATABASE_URL` 时，本地开发和自动化测试使用内存种子数据；Docker 部署会连接内部 PostgreSQL。首次启动会写入缺失的分类、状态和菜谱数据，已有数据库记录不会在重启时被覆盖。

## 检查与构建

```bash
pnpm verify:backend
pnpm build:backend
```

## ECS Docker 部署

首次部署时：

1. 将 `.env.example` 复制为 `.env`，按生产环境修改。
   `DB_PASSWORD` 必须替换为随机强密码；数据库仅在 Docker 内部网络开放。
2. 将 `deploy/nginx-api.conf.example` 安装为 Nginx 站点配置；生产环境示例将宿主机 `3100` 端口反向代理到 API。
3. 为 `fandazi-api.coder-f-nowork.cn` 配置 HTTPS 证书。
4. 在仓库根目录执行 `pnpm deploy:backend`。

常用运维命令：

```bash
pnpm logs:backend
pnpm stop:backend
curl http://127.0.0.1:3100/health
curl https://fandazi-api.coder-f-nowork.cn/api/v1/bootstrap
```

Compose 默认只将 API 映射到服务器回环地址 `127.0.0.1:3100`，由 Nginx 对公网提供 HTTPS，不直接暴露容器端口。

## 自动部署

推送到 `main` 后，`.github/workflows/deploy-prod.yml` 会通过 SSH 登录 ECS，在 `/opt/fandazi` 拉取最新提交并执行 Docker Compose 部署。Action 不重复运行项目类型检查和测试，只使用 Compose 健康检查与线上接口检查确认部署结果。

仓库需要配置以下 GitHub Actions Secrets：

- `ECS_HOST`：ECS 公网 IP 或可访问主机名。
- `ECS_USER`：SSH 用户，当前服务器使用 `root`。
- `ECS_SSH_KEY`：能够登录上述用户的专用 SSH 私钥全文。
