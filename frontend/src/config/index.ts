// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const config = {
  apiBaseUrl: API_BASE_URL,
  openaiApiKey: OPENAI_API_KEY,
  defaultModel: 'gpt-4o',
  defaultTemperature: 0.7,
} as const;

export default config;
