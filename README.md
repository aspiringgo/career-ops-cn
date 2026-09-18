# Career Ops CN

本地优先的中文求职分析工作区，借鉴 Career Ops 的核心方法：用户提供自己的简历和岗位信息，AI 先整理资料，再进行岗位匹配、缺口分析、申请策略和面试准备，最后生成 Markdown 报告供人工审阅。

> 这是一个本地 CLI 工具，不是在线求职平台。你的简历、JD 和 API 请求默认留在你的电脑上。

## 特点

- 不默认读取示例简历或岗位
- 第 1 步：上传或指定你的简历文件
- 第 2 步：粘贴 JD、指定 JD 文件，或提供岗位链接
- 支持 PDF、Markdown 和 TXT 简历
- AI 先将 PDF/网页内容整理成中文 Markdown
- 支持 DeepSeek、通义千问 Qwen、智谱 GLM、Claude、OpenAI
- 报告只保存到本地，不自动投递或联系企业
- API Key 只从本地 `.env` 读取，不写进报告

完整的用户手册见：[USER_GUIDE.md](USER_GUIDE.md)

## 快速开始

```bash
cd career-ops-cn
cp .env.example .env
npm install
```

也可以安装为本机命令：

```bash
npm link
career-ops-cn --help
```

编辑 `.env`，填入一个模型的 API Key，例如：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_MODEL=deepseek-chat
```

## 运行

```bash
npm start -- \
  --resume ~/Documents/我的简历.pdf \
  --jd ~/Documents/岗位描述.md \
  --title "AI 产品经理岗位评估"
```

使用岗位链接：

```bash
npm start -- \
  --resume ~/Documents/我的简历.pdf \
  --jd-url https://example.com/jobs/123 \
  --provider deepseek
```

如果没有提供 `--resume` 和 `--jd/--jd-url`，程序会显示中文提示并停止，不会读取默认资料。

## 工作流

```text
简历文件 + JD 文件或链接
          ↓
AI 读取并整理为中文 Markdown
          ↓
AI 进行岗位匹配和证据检查
          ↓
生成优势、缺口、申请策略、面试问题
          ↓
本地保存 Markdown 报告
```

输出目录：

```text
normalized/resume.md
normalized/job-description.md
reports/*.md
```

## 用户自带 API Key

本地模式不需要平台后端。用户可以将自己的 Key 临时注入当前命令：

```bash
CAREER_OPS_API_KEY=你的Key npm start -- \
  --provider deepseek \
  --resume ~/Documents/cv.pdf \
  --jd-url https://example.com/job
```

该 Key 只用于当前进程，不会写入报告。不要提交 `.env`，也不要在 issue 或终端日志中公开 Key。

## 设计边界

Career Ops CN 不自动提交求职申请、不自动联系招聘方。所有评分、简历修改和申请动作都由用户审核。

## 卸载

如果使用了 `npm link`：

```bash
npm unlink -g career-ops-cn
```

删除项目目录即可移除本地报告、依赖和配置：

```bash
rm -rf career-ops-cn
```

如果使用 Git 克隆：

```bash
rm -rf career-ops-cn
```
