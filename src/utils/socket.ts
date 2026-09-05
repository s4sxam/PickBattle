import { getGameClient, UnifiedGameClient } from './p2pNetwork';

// Export unified game client that acts as socket drop-in replacement
export function getSocket(): UnifiedGameClient {
  return getGameClient();
}

export type { UnifiedGameClient };
