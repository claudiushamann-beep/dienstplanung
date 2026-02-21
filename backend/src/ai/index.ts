import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { OllamaProvider } from './ollama.js';
import { AIProviderConfig } from './types.js';

export type AIProvider = OpenAIProvider | AnthropicProvider | GoogleProvider | OllamaProvider;

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'google':
      return new GoogleProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unbekannter Provider-Typ: ${config.type}`);
  }
}

export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { GoogleProvider } from './google.js';
export { OllamaProvider } from './ollama.js';
