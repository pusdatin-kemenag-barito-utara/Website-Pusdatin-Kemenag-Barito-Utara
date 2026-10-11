import { env } from "./env";

interface LandingData {
  stats: {
    totalAppsCount: number;
    onlineAppsCount: number;
    totalAnnouncements: number;
    superAdminCount: number;
    systemHealthPercent: number;
  };
  apps: any[];
}

const fallbackData: LandingData = {
  stats: {
    totalAppsCount: 11,
    onlineAppsCount: 11,
    totalAnnouncements: 3,
    superAdminCount: 1,
    systemHealthPercent: 100,
  },
  apps: [],
};

let cache: { data: LandingData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 detik cache in-memory

function getPocketBaseEndpoint(): string {
  return (
    env.pocketbaseUrl ||
    (typeof process !== "undefined" && process.env?.PUBLIC_POCKETBASE_URL) ||
    "https://db-pusdatin.kemenag-baritoutara.com"
  );
}

async function fetchFromPocketBase(): Promise<LandingData | null> {
  const pbUrl = getPocketBaseEndpoint();
  if (!pbUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const [appsRes, onlineRes, announcementsRes, profilesRes] = await Promise.all([
      fetch(`${pbUrl}/api/collections/satellite_apps/records?perPage=50&sort=sort_order`, {
        signal: controller.signal,
      }),
      fetch(`${pbUrl}/api/collections/satellite_apps/records?perPage=1&filter=status%3D%27online%27`, {
        signal: controller.signal,
      }),
      fetch(`${pbUrl}/api/collections/announcements/records?perPage=1&filter=is_active%3Dtrue`, {
        signal: controller.signal,
      }),
      fetch(`${pbUrl}/api/collections/profiles/records?perPage=1&filter=role%3D%27super_admin%27`, {
        signal: controller.signal,
      }),
    ]);
    clearTimeout(timeout);

    const appsJson = appsRes.ok ? await appsRes.json() : null;
    const onlineJson = onlineRes.ok ? await onlineRes.json() : null;
    const annJson = announcementsRes.ok ? await announcementsRes.json() : null;
    const profJson = profilesRes.ok ? await profilesRes.json() : null;

    const totalAppsCount = appsJson?.totalItems ?? 0;
    const onlineAppsCount = onlineJson?.totalItems ?? totalAppsCount;
    const totalAnnouncements = annJson?.totalItems ?? 0;
    const superAdminCount = profJson?.totalItems ?? 1;

    const rawItems = appsJson?.items ?? [];
    const apps = rawItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || "",
      url: item.url || "",
      icon: item.icon || "",
      status: item.status || "online",
      sortOrder: item.sort_order ?? 0,
      schemaName: item.schema_name || "",
      schemaUrl: item.schema_url || "",
      availableFeatures: item.available_features || [],
    }));

    return {
      stats: {
        totalAppsCount,
        onlineAppsCount,
        totalAnnouncements,
        superAdminCount,
        systemHealthPercent: 100,
      },
      apps,
    };
  } catch (err) {
    console.warn("[LandingData] PocketBase direct fetch failed:", err);
    return null;
  }
}

export async function getLandingData(): Promise<LandingData> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  // 1. Coba ambil dari Backend Go lokal jika aktif
  const backendUrl =
    (typeof process !== "undefined" && process.env?.BACKEND_URL) || "http://127.0.0.1:8080";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${backendUrl}/api/landing/stats`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const rawStats = json?.data?.stats ?? json?.stats;
      const rawApps = json?.data?.apps ?? json?.apps;

      if (rawStats && rawStats.totalAppsCount > 0) {
        const data: LandingData = {
          stats: rawStats,
          apps: rawApps ?? [],
        };
        cache = { data, expiresAt: now + CACHE_TTL_MS };
        return data;
      }
    }
  } catch {
    // Backend offline / timed out, lanjutkan ke PocketBase langsung
  }

  // 2. Fetch langsung ke PocketBase API secara andal
  const pbData = await fetchFromPocketBase();
  if (pbData && (pbData.stats.totalAppsCount > 0 || pbData.apps.length > 0)) {
    cache = { data: pbData, expiresAt: now + CACHE_TTL_MS };
    return pbData;
  }

  if (cache) {
    return cache.data;
  }

  return fallbackData;
}

let announcementCache: { data: any[]; expiresAt: number } | null = null;

async function fetchAnnouncementsFromPocketBase(): Promise<any[]> {
  const pbUrl = getPocketBaseEndpoint();
  if (!pbUrl) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `${pbUrl}/api/collections/announcements/records?perPage=50&filter=is_active%3Dtrue&sort=-created_at`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      return (json.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        tag: item.tag || "Informasi",
        isImportant: item.is_important ?? false,
        isActive: item.is_active ?? true,
        orderIndex: item.order_index ?? 0,
        createdAt: item.created_at || item.created,
        updatedAt: item.updated_at || item.updated,
      }));
    }
  } catch (err) {
    console.warn("[LandingData] PocketBase announcements fetch failed:", err);
  }
  return [];
}

export async function getAnnouncementsData(): Promise<any[]> {
  const now = Date.now();
  if (announcementCache && announcementCache.expiresAt > now) {
    return announcementCache.data;
  }

  // 1. Coba dari Backend Go
  const backendUrl =
    (typeof process !== "undefined" && process.env?.BACKEND_URL) || "http://127.0.0.1:8080";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${backendUrl}/api/announcements`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : json?.data ?? [];
      if (rawList.length > 0) {
        announcementCache = { data: rawList, expiresAt: now + CACHE_TTL_MS };
        return rawList;
      }
    }
  } catch {
    // Backend offline, fallback ke PocketBase
  }

  // 2. Fetch langsung dari PocketBase API
  const pbList = await fetchAnnouncementsFromPocketBase();
  if (pbList.length > 0) {
    announcementCache = { data: pbList, expiresAt: now + CACHE_TTL_MS };
    return pbList;
  }

  if (announcementCache) {
    return announcementCache.data;
  }
  return [];
}
