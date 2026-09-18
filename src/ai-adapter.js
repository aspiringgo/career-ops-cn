const axios = require('axios');

const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    envPrefix: 'DEEPSEEK',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  qwen: {
    label: '通义千问 Qwen',
    envPrefix: 'QWEN',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus'
  },
  zhipu: {
    label: '智谱 GLM',
    envPrefix: 'ZHIPU',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash'
  },
  anthropic: {
    label: 'Anthropic Claude',
    envPrefix: 'CLAUDE',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-20241022',
    protocol: 'anthropic'
  },
  openai: {
    label: 'OpenAI / ChatGPT',
    envPrefix: 'OPENAI',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini'
  }
};

function getProviderConfig(provider = process.env.AI_PROVIDER || 'deepseek') {
  const providerId = Object.prototype.hasOwnProperty.call(PROVIDERS, provider) ? provider : 'deepseek';
  const config = PROVIDERS[providerId];
  const prefix = config.envPrefix;
  return {
    id: providerId,
    ...config,
    apiKey: process.env[`${prefix}_API_KEY`] || '',
    baseUrl: process.env[`${prefix}_API_BASE_URL`] || config.baseUrl,
    model: process.env[`${prefix}_MODEL`] || config.model
  };
}

async function callAI({ provider, apiKey, systemPrompt, userPrompt }) {
  const config = getProviderConfig(provider);
  const resolvedApiKey = apiKey || config.apiKey;
  if (!resolvedApiKey) {
    return { ok: false, reason: `未配置 ${config.label} API Key`, provider: config.id, model: config.model };
  }

  const isAnthropic = config.protocol === 'anthropic';
  const endpoint = isAnthropic ? `${config.baseUrl}/v1/messages` : `${config.baseUrl}/v1/chat/completions`;
  const body = isAnthropic
    ? { model: config.model, max_tokens: 1800, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }
    : {
        model: config.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      };

  try {
    const response = await axios.post(endpoint, body, {
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
        ...(isAnthropic
          ? { 'x-api-key': resolvedApiKey, 'anthropic-version': '2023-06-01' }
          : { Authorization: `Bearer ${resolvedApiKey}` })
      }
    });
    const raw = isAnthropic
      ? response.data?.content?.[0]?.text || ''
      : response.data?.choices?.[0]?.message?.content || '';
    return { ok: true, raw, provider: config.id, model: config.model };
  } catch (error) {
    return {
      ok: false,
      reason: error.response?.data?.error?.message || error.message,
      provider: config.id,
      model: config.model
    };
  }
}

module.exports = { callAI, getProviderConfig, PROVIDERS };
