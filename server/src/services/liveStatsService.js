import { emitAppEvent } from "./socketHub.js";

let liveStats = {
  viewerCount: 0,
  updatedAt: null
};

export function getLiveStats() {
  return liveStats;
}

export function updateLiveStats(nextStats) {
  liveStats = {
    ...liveStats,
    ...nextStats,
    updatedAt: new Date().toISOString()
  };

  emitAppEvent("live:stats-updated", liveStats);
  return liveStats;
}

