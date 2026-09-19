# Career Ops CN 用户手册

## 这是什么

Career Ops CN 是一个本地优先的中文求职分析 CLI。它借鉴 Career Ops 的工作方式，把一次求职评估拆成清晰的步骤：

```text
用户提供简历
      ↓
用户提供 JD 文件或岗位链接
      ↓
AI 整理简历和 JD
      ↓
AI 做匹配、证据检查和中文求职分析
      ↓
生成 Markdown 报告
      ↓
用户人工审核后决定下一步
```

它不会自动投递，不会自动联系招聘方，也不会替用户做最终求职决定。

## 系统要求

- Node.js 20 或更高版本
- npm
- 一个可用的 AI Provider API Key
- 可访问对应 AI Provider 的网络连接

检查版本：

```bash
node --version
npm --version
```

## 安装方式一：从 GitHub 克隆

```bash
git clone https://github.com/aspiringgo/career-ops-cn.git
cd career-ops-cn
npm install
```

网络较慢时可以使用 npm 镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

## 安装方式二：作为本机命令链接

适合开发或修改代码时使用：

```bash
cd career-ops-cn
npm install
npm link
career-ops-cn --help
```

## 配置 AI Provider

复制配置模板：

```bash
cp .env.example .env
```

### API Key 应该存在哪里

普通用户请把 Key 存在本机项目根目录：

```text
career-ops-cn/.env
```

例如，如果项目放在 `~/Projects`，文件位置就是：

```text
~/Projects/career-ops-cn/.env
```

`.env` 只存在于用户自己的电脑上，并且已被 `.gitignore` 排除，不会随公开 GitHub 仓库发布。不要把 Key 放进 README、源代码、简历、JD、小程序代码、issue、截图或终端日志。

编辑 `.env`，选择一个 Provider。推荐中文场景先使用 DeepSeek：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
DEEPSEEK_MODEL=deepseek-chat
```

支持的 Provider：

### DeepSeek

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的Key
DEEPSEEK_MODEL=deepseek-chat
```

### 通义千问

```env
AI_PROVIDER=qwen
QWEN_API_KEY=你的Key
QWEN_MODEL=qwen-plus
```

### 智谱 GLM

```env
AI_PROVIDER=zhipu
ZHIPU_API_KEY=你的Key
ZHIPU_MODEL=glm-4-flash
```

也支持 Anthropic Claude 和 OpenAI/ChatGPT，完整变量见 `.env.example`。

## 不保存 API Key 的临时用法

如果不想把 Key 写进 `.env`，可以只注入当前进程：

```bash
CAREER_OPS_API_KEY=你的Key npm start -- \
  --provider deepseek \
  --resume ~/Documents/resume.pdf \
  --jd ~/Documents/job.md
```

程序只在当前进程读取这个环境变量，不会把它写入报告、规范化文件或日志。命令结束后，Career Ops CN 不会保存这个临时 Key。`.env` 已加入 `.gitignore`，不要把它提交到 GitHub。

## 运行帮助

```bash
npm start -- --help
```

程序会明确提示：

```text
第 1 步：提供简历文件
第 2 步：提供 JD 文件，或提供岗位链接
```

程序不会默认读取示例简历或示例 JD。

## 使用本地文件

简历支持 PDF、Markdown 和 TXT：

```bash
npm start -- \
  --provider deepseek \
  --resume ~/Documents/我的简历.pdf \
  --jd ~/Documents/岗位描述.md \
  --title "AI 产品经理岗位评估"
```

### PDF 的处理方式

程序先提取 PDF 文本，再让 AI 整理成中文 Markdown。扫描图片型 PDF 可能没有可提取文字；这种情况需要先 OCR，或将文字复制到 Markdown/TXT 文件。

## 使用岗位链接

```bash
npm start -- \
  --provider deepseek \
  --resume ~/Documents/我的简历.pdf \
  --jd-url https://example.com/jobs/123
```

网页会先提取可读文本，再交给 AI 整理。部分招聘网站会阻止自动抓取；遇到这种情况，请复制 JD 内容保存成 `.md` 文件后使用 `--jd`。

## 输出文件

运行后会生成：

```text
normalized/resume.md
normalized/job-description.md
reports/YYYY-MM-DD...-provider.md
```

报告包含：

- 综合匹配分
- 匹配优势
- 能力缺口
- 申请建议
- 面试问题
- 中国招聘语境下的申请策略

`normalized/` 和 `reports/` 已加入 `.gitignore`，不会被提交到 GitHub。

## 本地降级模式

没有 API Key、网络失败或 Provider 返回错误时，程序仍会读取文件并生成基础报告：

```json
{
  "aiUsed": false
}
```

这代表没有完成 AI 语义分析，不代表文件读取失败。

## 隐私与安全

- 推荐存储位置：本地项目根目录 `career-ops-cn/.env`
- `.env` 不会被公开仓库收录
- API Key 不写入报告
- API Key 不写入 `normalized/`
- `.env` 不提交到 GitHub
- 简历和 JD 默认只保存在本地
- 使用岗位 URL 时，网页内容会发送给你选择的 AI Provider
- 不要把 API Key 粘贴到 issue、README 或终端日志
- 如果 API Key 曾经泄露，应立即在 Provider 控制台撤销并重新生成

## 卸载

### 卸载本机命令

如果执行过 `npm link`：

```bash
npm unlink -g career-ops-cn
```

### 删除本地项目

```bash
rm -rf career-ops-cn
```

这会删除本地依赖、`.env`、报告和规范化资料。需要保留报告时，请先复制 `reports/` 到安全位置。

### 删除 GitHub 仓库

在 GitHub 仓库页面进入：

```text
Settings → General → Danger Zone → Delete this repository
```

删除 GitHub 仓库不会删除你电脑上的本地目录。

## 开源开发

```bash
npm install
npm run help
node -c src/cli.js
node -c src/ai-adapter.js
```

欢迎提交问题和改进，但请不要提交真实简历、岗位数据、API Key 或生成报告。