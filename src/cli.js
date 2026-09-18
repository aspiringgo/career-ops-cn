#!/usr/bin/env node

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const parsePdf = require('pdf-parse');
const { callAI, getProviderConfig } = require('./ai-adapter');

const root = path.join(__dirname, '..');
const normalizedDirectory = path.join(root, 'normalized');
const reportsDirectory = path.join(root, 'reports');

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? '' : args[index + 1] || '';
}

function printHelp() {
  console.log('Career Ops CN：本地中文求职分析工作区');
  console.log('');
  console.log('第 1 步：提供简历文件（支持 PDF、MD、TXT）。');
  console.log('第 2 步：提供 JD 文件，或提供岗位链接。');
  console.log('');
  console.log('用法：');
  console.log('  npm start -- --resume ~/Documents/简历.pdf --jd ~/Documents/JD.md');
  console.log('  npm start -- --resume ~/Documents/简历.pdf --jd-url https://example.com/job');
  console.log('');
  console.log('可选参数：--provider deepseek|qwen|zhipu|anthropic|openai --title 标题');
}

function requireInput(value, message) {
  if (!value) throw new Error(message);
  return path.resolve(value);
}

async function readFileInput(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label}不存在：${filePath}`);
  const extension = path.extname(filePath).toLowerCase();
  const content = extension === '.pdf'
    ? (await parsePdf(fs.readFileSync(filePath))).text
    : fs.readFileSync(filePath, 'utf8');
  if (!content.trim()) throw new Error(`${label}为空：${filePath}`);
  return { source: filePath, text: content.trim() };
}

function cleanWebText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readJob(filePath, url) {
  if (url) {
    const response = await axios.get(url, { timeout: 30000, responseType: 'text' });
    const text = cleanWebText(response.data);
    if (!text) throw new Error('岗位链接没有提取到可读内容，请复制 JD 文本保存为 .md 后重试。');
    return { source: url, text };
  }
  return readFileInput(filePath, 'JD 文件');
}

function parseJson(raw, fallback) {
  try {
    return { ...fallback, ...JSON.parse(raw.replace(/```json|```/g, '').trim()) };
  } catch (error) {
    return { ...fallback, parseWarning: 'AI 返回格式异常，已保留可读文本和本地基础结果。' };
  }
}

function fallbackResult(resume, jd) {
  const resumeWords = new Set(resume.toLowerCase().split(/\s+/).filter((item) => item.length > 1));
  const jdWords = [...new Set(jd.toLowerCase().split(/\s+/).filter((item) => item.length > 1))];
  const overlap = jdWords.filter((item) => resumeWords.has(item));
  return {
    score: Math.min(100, 35 + overlap.length * 5),
    summary: 'AI 暂不可用，已完成文本读取并保留本地基础结果。',
    strengths: overlap.length ? [`发现 ${overlap.length} 个文本关键词重合`] : ['已成功读取简历和 JD'],
    gaps: ['请人工核对岗位核心能力与简历证据'],
    recommendations: ['补充可量化的项目成果', '按岗位职责调整简历顺序', '准备对应岗位的 STAR 案例'],
    interviewQuestions: ['请介绍一个最能证明你胜任该岗位的项目。'],
    applicationStrategy: ['优先突出与岗位要求直接相关的真实经历。']
  };
}

async function normalize(document, type, provider, userApiKey) {
  const result = await callAI({
    provider,
    apiKey: userApiKey,
    systemPrompt: `你是中国求职资料整理助手。把${type}整理成中文 Markdown。只返回 JSON：{"markdown":"...","title":"...","warnings":[]}。保留事实，不编造经历；不确定内容标记为“待确认”。`,
    userPrompt: `请整理以下${type}：\n\n${document.text}`
  });
  if (!result.ok) return { ...document, normalized: document.text, error: result.reason };
  try {
    const parsed = JSON.parse(result.raw.replace(/```json|```/g, '').trim());
    return { ...document, normalized: parsed.markdown || document.text, error: null };
  } catch (error) {
    return { ...document, normalized: document.text, error: 'AI 整理格式异常' };
  }
}

function list(items) {
  return (items || []).map((item) => `- ${item}`).join('\n') || '- 暂无';
}

function makeReport({ title, provider, model, resume, jd, result, aiError }) {
  return `# ${title}\n\n- 生成时间：${new Date().toLocaleString('zh-CN')}\n- Provider：${provider}\n- 模型：${model}\n- 简历来源：${resume.source}\n- JD 来源：${jd.source}\n\n## 综合评分\n\n**${result.score} / 100**\n\n${result.summary}\n\n## 匹配优势\n\n${list(result.strengths)}\n\n## 能力缺口\n\n${list(result.gaps)}\n\n## 申请建议\n\n${list(result.recommendations)}\n\n## 面试问题\n\n${list(result.interviewQuestions)}\n\n## 中国语境下的申请策略\n\n${list(result.applicationStrategy)}\n${aiError ? `\n## AI 调用说明\n\n${aiError}\n` : ''}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) return printHelp();
  const resumePath = requireInput(option(args, '--resume'), '第 1 步：请使用 --resume 提供你的简历文件。');
  const jdPathValue = option(args, '--jd');
  const jdUrl = option(args, '--jd-url');
  if (!jdPathValue && !jdUrl) throw new Error('第 2 步：请使用 --jd 提供 JD 文件，或使用 --jd-url 提供岗位链接。');

  const provider = option(args, '--provider') || process.env.AI_PROVIDER || 'deepseek';
  const title = option(args, '--title') || '中文岗位匹配评估';
  const userApiKey = process.env.CAREER_OPS_API_KEY || '';
  const config = getProviderConfig(provider);

  console.log('第 1 步：正在读取并整理简历...');
  const sourceResume = await readFileInput(resumePath, '简历文件');
  const sourceJd = await readJob(jdPathValue ? path.resolve(jdPathValue) : '', jdUrl);
  const resume = await normalize(sourceResume, '简历', provider, userApiKey);
  console.log('第 2 步：正在读取并整理 JD...');
  const jd = await normalize(sourceJd, '岗位描述', provider, userApiKey);
  fs.mkdirSync(normalizedDirectory, { recursive: true });
  fs.writeFileSync(path.join(normalizedDirectory, 'resume.md'), resume.normalized);
  fs.writeFileSync(path.join(normalizedDirectory, 'job-description.md'), jd.normalized);

  console.log('第 3 步：正在进行中文岗位匹配分析...');
  const fallback = fallbackResult(resume.normalized, jd.normalized);
  const evaluation = await callAI({
    provider,
    apiKey: userApiKey,
    systemPrompt: '你是中国求职场景的 Career Ops 分析引擎。只返回 JSON：score(0-100), summary, strengths[], gaps[], recommendations[], interviewQuestions[], applicationStrategy[]。只使用简历中的真实证据，不要编造。',
    userPrompt: `岗位描述：\n${jd.normalized}\n\n候选人简历：\n${resume.normalized}`
  });
  const result = evaluation.ok ? parseJson(evaluation.raw, fallback) : fallback;
  const aiError = evaluation.ok ? null : evaluation.reason;
  fs.mkdirSync(reportsDirectory, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${config.id}.md`;
  const reportPath = path.join(reportsDirectory, filename);
  fs.writeFileSync(reportPath, makeReport({ title, provider: evaluation.provider || config.id, model: evaluation.model || config.model, resume: sourceResume, jd: sourceJd, result, aiError }));
  console.log(JSON.stringify({ success: true, reportPath, provider: evaluation.provider || config.id, model: evaluation.model || config.model, aiUsed: evaluation.ok, score: result.score }, null, 2));
}

main().catch((error) => {
  console.error(`\nCareer Ops CN 运行失败：${error.message}`);
  process.exitCode = 1;
});
