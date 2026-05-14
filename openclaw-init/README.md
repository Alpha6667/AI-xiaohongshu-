# OpenClaw 初始化配置

## 使用方式

```bash
# 1. 安装 OpenClaw
npm install -g openclaw

# 2. 把配置复制到工作目录
cp openclaw.json /root/.openclaw/openclaw.json

# 3. 编辑配置，填 API key
nano /root/.openclaw/openclaw.json
# 找到以下字段替换：
# - YOUR_GATEWAY_TOKEN_HERE → 设为随机字符串
# - YOUR_DEEPSEEK_API_KEY → 你的 DeepSeek API key
# - YOUR_JDCLOUD_API_KEY → 你的京东云 API key

# 4. 启动 OpenClaw
openclaw gateway start
```

## 文件说明

- `openclaw.json` — 主配置文件，填 API key 后使用
- 其他配置见仓库 `.monkeycode/docs/DEPLOY_OPENCLAW_SETUP.md`
