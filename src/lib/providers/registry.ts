import type { ProviderType } from "@/generated/prisma/enums";
import type { FantasyProvider } from "@/lib/providers/types";
import { espnProvider } from "@/lib/providers/espn";

/** Every provider the app can sync from. Adding a platform means adding one
 *  entry here and nothing else outside its own folder. */
const PROVIDERS: Partial<Record<ProviderType, FantasyProvider>> = {
  ESPN: espnProvider,
};

export function getProvider(type: ProviderType): FantasyProvider | null {
  return PROVIDERS[type] ?? null;
}

export function listProviders(): FantasyProvider[] {
  return Object.values(PROVIDERS).filter(Boolean) as FantasyProvider[];
}

export function isSyncable(type: ProviderType): boolean {
  return getProvider(type) !== null;
}
