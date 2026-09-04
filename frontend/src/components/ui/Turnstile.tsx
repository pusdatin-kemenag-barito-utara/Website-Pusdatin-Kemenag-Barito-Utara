import { useEffect, useRef } from "react";
import { env } from "@/lib/env";

interface TurnstileProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ onVerify, theme = "light" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    // Use official production site key (Clean display without testing banner)
    const siteKey = env.turnstileSiteKey || "0x4AAAAAADR1O_LSp1lgc3km";

    const renderWidget = () => {
      if (!isMounted || !container) return;

      if (window.turnstile && typeof window.turnstile.render === "function") {
        try {
          if (widgetIdRef.current) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch {
              // Ignore widget remove error
            }
            widgetIdRef.current = null;
          }

          container.innerHTML = "";

          const id = window.turnstile.render(container, {
            sitekey: siteKey,
            theme,
            size: "flexible",
            callback: (token: string) => {
              if (isMounted && onVerifyRef.current) {
                onVerifyRef.current(token);
              }
            },
            "expired-callback": () => {
              if (isMounted && onVerifyRef.current) {
                onVerifyRef.current("");
              }
            },
            "error-callback": (err: string) => {
              console.warn("[Turnstile] Error:", err);
            },
          });

          widgetIdRef.current = id;
        } catch (err) {
          console.error("[Turnstile] Render error:", err);
        }
      } else {
        pollTimer = setTimeout(renderWidget, 80);
      }
    };

    // Check if script is already present in document or loaded globally
    const hasScript =
      typeof window.turnstile !== "undefined" ||
      document.querySelector('script[src*="turnstile"]') !== null;

    if (!hasScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => renderWidget();
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup error
        }
        widgetIdRef.current = null;
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="w-full my-3 min-h-[65px] flex items-center justify-center [&>iframe]:w-full [&>iframe]:!w-full [&>div]:w-full"
    />
  );
}
