// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const config = {
  apiBaseUrl: API_BASE_URL,
  defaultModel: 'gpt-4o',
  defaultTemperature: 0.7,
} as const;

export default config;
