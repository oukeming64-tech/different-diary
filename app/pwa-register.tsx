"use client";

import { useEffect, useState } from "react";

export const PWA_UPDATE_READY_EVENT = "jianfei-paipai:pwa-update-ready";

export type PwaUpdateReadyDetail = {
  registration: ServiceWorkerRegistration;
};

declare global {
  interface WindowEventMap {
    "jianfei-paipai:pwa-update-ready": CustomEvent<PwaUpdateReadyDetail>;
  }
}

function announceUpdate(registration: ServiceWorkerRegistration) {
  window.dispatchEvent(
    new CustomEvent<PwaUpdateReadyDetail>(PWA_UPDATE_READY_EVENT, {
      detail: { registration },
    }),
  );
}

/**
 * Registers the local app shell and emits PWA_UPDATE_READY_EVENT when a new
 * version is waiting. The event is public so another surface can provide its
 * own quiet update treatment without coupling to this component.
 */
export function PwaRegister() {
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    const handleUpdateReady = (
      event: WindowEventMap[typeof PWA_UPDATE_READY_EVENT],
    ) => {
      setWaitingRegistration(event.detail.registration);
    };

    const watchRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      if (nextRegistration.waiting && navigator.serviceWorker.controller) {
        announceUpdate(nextRegistration);
      }

      nextRegistration.addEventListener("updatefound", () => {
        const installing = nextRegistration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            announceUpdate(nextRegistration);
          }
        });
      });
    };

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register(
          "/sw.js",
          { scope: "/" },
        );
        if (!disposed) watchRegistration(nextRegistration);
      } catch {
        // Offline registration or update failures should never interrupt use.
      }
    };

    window.addEventListener(PWA_UPDATE_READY_EVENT, handleUpdateReady);

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener(PWA_UPDATE_READY_EVENT, handleUpdateReady);
      window.removeEventListener("load", register);
    };
  }, []);

  function useNewVersion() {
    const waiting = waitingRegistration?.waiting;
    if (!waiting) return;

    const reloadWhenActive = () => window.location.reload();
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadWhenActive,
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (!waitingRegistration) return null;

  return (
    <aside className="pwa-update" role="status" aria-live="polite">
      <p>有一个新版本准备好了。写完手上的内容，再更新也可以。</p>
      <div className="pwa-update-actions">
        <button type="button" onClick={useNewVersion}>
          现在更新
        </button>
        <button type="button" onClick={() => setWaitingRegistration(null)}>
          稍后再说
        </button>
      </div>
    </aside>
  );
}
