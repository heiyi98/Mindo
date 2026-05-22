# Mindo 工作栈与服务文档

## 开发环境
- 操作系统：Windows
- 终端：PowerShell 5.x
  - 路径含括号时必须用 -LiteralPath 参数
  - 文件写入用 [System.IO.File]::WriteAllText()
- IDE：Cursor（内置Claude Code）
- 本地项目路径：E:\destinos

## 代码托管与部署
- **GitHub**：github.com/heiyi98/Mindo（公开仓库）
- **Vercel**：连接GitHub，push main自动部署
  - 生产URL：https://mindo-web.vercel.app
  - 重要：git commit必须用heiyi98账号，否则Vercel拒绝部署（blocked）
  - 本地测试：cd E:\destinos\apps\web && pnpm dev
  - 推送：git add . && git commit -m "..." && git push

## 数据库
- **Supabase**（项目ID：wsbskrgrkajnzzgpcfws）
  - PostgreSQL + RLS行级安全
  - Auth认证（Magic Link + Google OAuth）
  - 本地和Vercel共用同一个实例
  - 重要规范：新增字段必须先在Supabase执行SQL，再写代码

## AI服务
- **Gemini 1.5 Pro**（Google）
  - 用途：八字AI解读生成
  - 调用路径：/api/ai/reading（后端，不暴露Prompt）
  - 语言策略：永远用中文生成，其他语言通过AI翻译后缓存

## 支付服务
- **国际版**：Lemon Squeezy
  - Checkout：/api/payments/checkout
  - Webhook：/api/payments/webhook
- **中国版**：待定（微信支付/支付宝）

## 城市搜索
- **OpenStreetMap Nominatim**（免费，无需API Key）
  - 请求必须带 addressdetails=1 获取country_code和省级代码
  - User-Agent必须设置：'Mindo-Quantum-Engine/1.0'
  - 时区由 administrative-timezones.ts 映射表处理

## 待接入服务（规划中）
- **中国版服务器**：阿里云（合规 + 本地化部署）
- **文件存储**：Cloudflare R2（用户头像/论坛图片/商品图）
- **实时通信**：Supabase Realtime（论坛通知/私信）
- **中国版Auth**：微信登录

## 环境变量（apps/web/.env.local）
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_API_KEY
```

## 施工工作流
1. 在Project对话讨论需求，获取施工指令
2. 在Cursor开新Chat，第一句：请读取 E:\destinos\CLAUDE.md
3. 执行施工，type-check零错误
4. 更新CLAUDE.md
5. git add . && git commit -m "..." && git push
6. 重新上传CLAUDE.md到Project替换旧文件