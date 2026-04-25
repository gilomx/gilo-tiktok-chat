import { getLiveStats } from "./liveStatsService.js";
import { getRecentMessages } from "./messageStoreService.js";
import { getOverlayConfig } from "./overlayConfigService.js";

export async function getOverlaySnapshot() {
  return {
    emittedAt: new Date().toISOString(),
    overlayConfig: await getOverlayConfig(),
    recentMessages: getRecentMessages(10),
    liveStats: getLiveStats()
  };
}
