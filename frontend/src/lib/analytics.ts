/**
 * Enterprise Google Analytics (GA4) & Google Tag Manager (GTM) Telemetry
 * Portal PUSDATIN Kemenag Barito Utara
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface AppClickEvent {
  id: string;
  name: string;
  url?: string | null;
  schemaName?: string;
  category?: string;
}

export interface SearchEvent {
  query: string;
  resultCount?: number;
  location?: string;
}

/**
 * Base custom event dispatcher to GA4 and DataLayer (GTM)
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  // 1. Dispatch to window.dataLayer (for GTM triggers & variables)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    timestamp: new Date().toISOString(),
    ...params,
  });

  // 2. Dispatch to GA4 via gtag
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

/**
 * Track SPA / Astro View Transition Page View
 */
export function trackPageView(pagePath?: string, pageTitle?: string) {
  if (typeof window === "undefined") return;

  const path = pagePath || window.location.pathname + window.location.search;
  const title = pageTitle || document.title;

  trackEvent("page_view", {
    page_location: window.location.href,
    page_path: path,
    page_title: title,
    send_to: "G-FN3SKRFG3J",
  });
}

/**
 * Track Application Click / Service Portal Entry (High-value Conversion)
 */
export function trackAppClick(app: AppClickEvent) {
  trackEvent("select_content", {
    content_type: "satellite_application",
    item_id: app.id,
    item_name: app.name,
    destination_url: app.url,
    schema_name: app.schemaName || "",
    category: app.category || "Layanan Publik",
  });

  trackEvent("app_launch", {
    app_id: app.id,
    app_name: app.name,
    app_url: app.url,
  });
}

/**
 * Track Search Queries
 */
export function trackSearch({ query, resultCount, location = "portal" }: SearchEvent) {
  if (!query.trim()) return;

  trackEvent("search", {
    search_term: query.trim(),
    results_count: resultCount,
    search_location: location,
  });
}

/**
 * Track Category & Filter Interactions
 */
export function trackFilterChange(filterType: string, filterValue: string) {
  trackEvent("filter_interaction", {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

/**
 * Track Announcement Clicks
 */
export function trackAnnouncementClick(announcement: { id: string; title: string; tag?: string }) {
  trackEvent("select_content", {
    content_type: "announcement",
    item_id: announcement.id,
    item_name: announcement.title,
    tag: announcement.tag || "Informasi",
  });
}

/**
 * Track Outbound Links (External websites/socials)
 */
export function trackOutboundLink(url: string, label: string) {
  trackEvent("click_outbound", {
    outbound_url: url,
    link_label: label,
  });
}

/**
 * Track Auth & Security Lifecycle
 */
export function trackAuthEvent(
  action: "login_attempt" | "login_success" | "login_failure" | "mfa_challenge" | "mfa_verify" | "logout",
  details?: Record<string, any>
) {
  trackEvent(action, {
    method: "hybrid_session",
    ...details,
  });
}

/**
 * Track Super Admin Operations (Audit Telemetry)
 */
export function trackAdminOperation(action: string, target: string, details?: Record<string, any>) {
  trackEvent("admin_management_action", {
    admin_action: action,
    target_entity: target,
    ...details,
  });
}
