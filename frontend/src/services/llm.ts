import OpenAI from 'openai/index.mjs';
import config from '../config';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
});

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const callLLM = async (
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse> => {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await openai.chat.completions.create({
      model: config.defaultModel,
      messages,
      temperature: config.defaultTemperature,
      max_tokens: 2000,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('LLM API Error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to call LLM API'
    );
  }
};

export default { callLLM };
