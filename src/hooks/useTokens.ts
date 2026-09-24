import { useEffect, useState } from "react";
import { subscribeMap, DEFAULT_MAP_BACKGROUND } from "@/lib/map";
import {
  migrateLegacyTokens,
  subscribeTokens,
  defaultVisibility,
} from "@/lib/tokens";
import type { MapToken } from "@/lib/types";

interface UseTokensOpts {
  isGM: boolean;
  uid?: string;
}

/** Assina fundo + tokens V2; GM migra o array legado uma vez. */
export function useTokens(campaignId: string, { isGM, uid }: UseTokensOpts) {
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [background, setBackground] = useState<string>(
    DEFAULT_MAP_BACKGROUND,
  );
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    const unsub = subscribeMap(campaignId, (map) => {
      if (map?.backgroundImage) setBackground(map.backgroundImage);
      const legacy = map?.tokens ?? [];
      if (isGM && !migrated && legacy.length > 0) {
        setMigrated(true);
        void migrateLegacyTokens(campaignId).catch((e) =>
          console.error("Migração de tokens falhou:", e),
        );
      }
    });
    return () => unsub();
  }, [campaignId, isGM, migrated]);

  useEffect(() => {
    const unsub = subscribeTokens(
      campaignId,
      { canSeeHidden: isGM, uid },
      setTokens,
    );
    return () => unsub();
  }, [campaignId, isGM, uid]);

  return { tokens, background };
}

export function tokenVisible(token: MapToken): boolean {
  return token.visible ?? defaultVisibility(token.type);
}

export function canDragToken(
  token: MapToken,
  viewer: { isGM: boolean; uid?: string },
): boolean {
  if (viewer.isGM) return true;
  return !!viewer.uid && token.ownerId === viewer.uid;
}
