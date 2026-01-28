/**
 * LLM Provider Factory
 * Selects and returns the appropriate LLM provider based on environment configuration
 */

import { ILLMProvider, LLMProviderType } from './types';
import { AzureOpenAIProvider } from './providers/azure-openai';
import { FallbackProvider } from './providers/fallback';
import { logger } from '../../utils/telemetry';

// Cache the provider instance
let cachedProvider: ILLMProvider | null = null;

/**
 * Get the configured LLM provider type from environment
 */
function getConfiguredProviderType(): LLMProviderType {
  // Check for explicit provider setting
  const explicitProvider = process.env.LLM_PROVIDER?.toLowerCase();
  if (explicitProvider) {
    if (['azure-openai', 'openai', 'anthropic', 'none'].includes(explicitProvider)) {
      return explicitProvider as LLMProviderType;
    }
  }

  // Auto-detect based on available credentials
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    return 'azure-openai';
  }

  // Add more auto-detection for future providers here
  // if (process.env.OPENAI_API_KEY) {
  //   return 'openai';
  // }
  // if (process.env.ANTHROPIC_API_KEY) {
  //   return 'anthropic';
  // }

  return 'none';
}

/**
 * Create a new provider instance based on type
 */
function createProvider(type: LLMProviderType): ILLMProvider {
  switch (type) {
    case 'azure-openai':
      return new AzureOpenAIProvider();

    // Add more providers here as they are implemented
    // case 'openai':
    //   return new OpenAIProvider();
    // case 'anthropic':
    //   return new AnthropicProvider();

    case 'none':
    default:
      return new FallbackProvider();
  }
}

/**
 * Get the LLM provider instance
 * Uses singleton pattern to reuse the same instance
 */
export function getLLMProvider(): ILLMProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = getConfiguredProviderType();
  const provider = createProvider(providerType);

  // Verify the provider is properly configured
  if (!provider.isConfigured()) {
    logger.warn('LLM provider is not properly configured, falling back to regex parser', { provider: providerType });
    cachedProvider = new FallbackProvider();
  } else {
    logger.info('Using LLM provider', { provider: provider.name });
    cachedProvider = provider;
  }

  return cachedProvider;
}

/**
 * Clear the cached provider (useful for testing or config changes)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
}

/**
 * Get information about the current provider
 */
export function getProviderInfo(): { name: string; configured: boolean } {
  const provider = getLLMProvider();
  return {
    name: provider.name,
    configured: provider.isConfigured(),
  };
}
