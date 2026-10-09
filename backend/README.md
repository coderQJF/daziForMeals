# 饭搭子 Node.js 后端

基于 Node.js、TypeScript 与 Fastify 的 API 服务，生产构建使用 Node.js 22。

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
- `POST /api/v1/auth/wechat`
- `GET /api/v1/meal-categories`
- `GET /api/v1/operations/recipes?limit=200` (`OPS_ADMIN_TOKEN`)
- `GET /api/v1/meals/current`
- `POST /api/v1/meals`
- `GET /api/v1/meals/:id?invite=...`
- `POST /api/v1/meals/:id/join`
- `PUT /api/v1/meals/:id/confirm`
- `PUT|DELETE /api/v1/meals/:id/dishes/:recipeId`
- `POST /api/v1/meals/:id/dishes/:recipeId/quantity`
- `PUT|DELETE /api/v1/meals/:id/wishes/:recipeId`
- `GET /api/v1/bootstrap?status=recover`
- `GET /api/v1/recipes?category=soup&q=汤&status=recover&sort=default&limit=20`
- `GET /api/v1/recipes/random?status=recover&exclude=1001,2002`
- `GET /api/v1/recipes/:id`
- `GET /api/v1/me`
- `PUT /api/v1/me`
- `GET /api/v1/plan?date=2026-09-08`
- `GET /api/v1/takeout?category=hot-pot`

饭局创建、加入和所有写操作均要求微信登录会话。邀请链接可以匿名预览饭局，登录后通过邀请码加入；成员人数不设上限。邀请在用餐时间 12 小时后过期，非成员预览响应不返回真实邀请码，生产环境也不记录携带邀请码的 Fastify 自动请求日志。

`GET /api/v1/meals/current` 读取用户最近创建或加入时持久选中的饭局；按中国日期判断，用餐日期已过时返回 `null`，今日或已创建的下一顿饭返回 `active`/`confirmed` 饭局。同一创建者在同一中国日期并发创建只会产生一个 `active` 饭局。确认后不再允许加入、修改菜品或修改“想吃”。菜品数量通过 `{ "delta": 1 }` 或 `{ "delta": -1 }` 在服务端原子更新。

菜类通过 `GET /api/v1/meal-categories` 实时读取，运营后台使用 `OPS_ADMIN_TOKEN` 调用 `GET|PUT|DELETE /api/v1/operations/meal-categories` 管理菜类及其菜谱关联。`GET /api/v1/operations/recipes?limit=200` 返回 `{ "data": Recipe[], "meta": { "total": number } }`，供后台完整加载关联候选菜谱，`limit` 上限为 500。

未登录客户端通过 `x-client-id` 区分设备。微信登录成功后，客户端改用服务端签名会话；首次登录会将当前设备的真实收藏、喜欢、做过、身体状态、计划菜谱和资料复制到微信账号，之后不会用其他设备数据覆盖账号已有数据。全新微信用户默认昵称为“微信用户”，头像、简介和行为数组均为空；旧版未修改过的演示默认会在登录时清理。状态保存在 PostgreSQL 的 `fandazi_user_state` 表中，微信 `session_key` 不会下发到客户端。

未设置 `DATABASE_URL` 时，本地开发和自动化测试使用内存种子数据；Docker 部署会连接内部 PostgreSQL。当前代码维护的菜谱种子会按稳定菜谱 ID 更新，用户行为数据不会被重启覆盖。

## 菜单数据模型

- `fandazi_meal`、`fandazi_meal_member`、`fandazi_meal_dish` 和 `fandazi_meal_wish` 保存真实饭局、不限人数成员、菜品数量和逐用户“想吃”。
- `fandazi_user_current_meal` 持久保存用户最近选中的饭局；`fandazi_meal_category` 和 `fandazi_meal_category_recipe` 保存运营后台可立即生效的菜类及菜谱关联。

- `fandazi_recipe` 是做菜内容的主库。分类、推荐、详情和饮食计划都通过稳定 `recipe_id` 引用它，不再在计划数据中复制菜名和图片。
- `fandazi_tag` 与 `fandazi_recipe_tag` 保存菜谱的多对多标签。状态标签和营养/场景标签分型保存；关联同时记录 `weight`、`source`（`manual`/`ai`）与 `confidence`，以后可以混用人工和 AI 标注而不改表结构。
- `fandazi_user_recipe_action` 保存用户与菜谱之间的收藏、喜欢、做过、计划关系。API 暂时继续返回 ID 数组以兼容现有小程序，PostgreSQL 内部已经按关系行存储并建立索引。
- `fandazi_takeout_shop` 是独立的外卖商家库，不与菜谱主库混用；外卖条目也有自己的 `tagIds`。
- `fandazi_recommendation_history` 保存每个用户最近看过的菜谱。随机接口优先从当前状态标签命中的菜谱中加权选择，并排除最近 8 条；候选耗尽后才允许重复。

菜谱目录在服务启动时加载为只读内存目录，当前请求不需要反复读取整张内容表；标签关系和用户行为仍在 PostgreSQL 建有查询索引。随机推荐只在命中的状态候选集中做加权抽样，不使用大表 `ORDER BY random()`，避免数据量增长后进行全表随机排序。

## 检查与构建

```bash
pnpm verify:backend
pnpm build:backend
```

## ECS Docker 部署

首次部署时：

1. 将 `.env.example` 复制为 `.env`，按生产环境修改。
   `DB_PASSWORD` 必须替换为随机强密码；数据库仅在 Docker 内部网络开放。
   `WECHAT_APP_SECRET` 只能保存在服务器 `.env`，不得提交到仓库；`SESSION_SECRET` 使用至少 32 字节的随机值。
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

推送到 `main` 后，`.github/workflows/deploy-prod.yml` 会通过 SSH 登录 ECS，在 `/opt/fandazi` 拉取最新提交、执行 Docker Compose 部署，并从 ECS 固定公网 IP 构建和上传微信小程序开发版本。Action 不重复运行项目类型检查和测试，只使用 Compose 健康检查与线上接口检查确认后端部署结果。

仓库需要配置以下 GitHub Actions Secrets：

- `ECS_HOST`：ECS 公网 IP 或可访问主机名。
- `ECS_USER`：SSH 用户，当前服务器使用 `root`。
- `ECS_SSH_KEY`：能够登录上述用户的专用 SSH 私钥全文。

微信上传密钥保存在 ECS 的 `/root/.config/fandazi/private.wx7fce988b19eee10d.key`，权限必须为 `600`，不得提交到 Git 仓库。当前微信公众平台的代码上传 IP 白名单已关闭；若未来重新开启，需要把 ECS 公网出口 IP 加入白名单。
