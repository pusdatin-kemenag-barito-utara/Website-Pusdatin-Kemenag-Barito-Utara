interface LandingData {
  stats: {
    totalAppsCount: number;
    layananMasyarakat: number;
    layananPegawai: number;
    totalAdmin: number;
    totalPegawai: number;
    totalMasyarakat: number;
  };
  apps: any[];
}

const fallbackData: LandingData = {
  stats: {
    totalAppsCount: 0,
    layananMasyarakat: 0,
    layananPegawai: 0,
    totalAdmin: 0,
    totalPegawai: 0,
    totalMasyarakat: 0,
  },
  apps: [],
};

let cache: { data: LandingData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 detik cache in-memory

export async function getLandingData(): Promise<LandingData> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
    const res = await fetch(`${backendUrl}/api/landing/stats`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const rawStats = json?.data?.stats ?? json?.stats ?? fallbackData.stats;
      const rawApps = json?.data?.apps ?? json?.apps ?? fallbackData.apps;

      const data: LandingData = {
        stats: rawStats,
        apps: rawApps,
      };

      cache = { data, expiresAt: now + CACHE_TTL_MS };
      return data;
    }
  } catch (err) {
    console.error("[LandingData] Error fetching landing stats:", err);
  }

  if (cache) {
    return cache.data; // Return stale cache jika backend lambat/down
  }

  return fallbackData;
}

let announcementCache: { data: any[]; expiresAt: number } | null = null;

export async function getAnnouncementsData(): Promise<any[]> {
  const now = Date.now();
  if (announcementCache && announcementCache.expiresAt > now) {
    return announcementCache.data;
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${backendUrl}/api/announcements`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : json?.data ?? [];
      announcementCache = { data: rawList, expiresAt: now + CACHE_TTL_MS };
      return rawList;
    }
  } catch (err) {
    console.error("[LandingData] Error fetching public announcements:", err);
  }

  if (announcementCache) {
    return announcementCache.data;
  }
  return [];
}

