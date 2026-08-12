"use client";

import { useEffect, useState } from "react";

const LAST_SYNC_KEY = "campus-manager:last-sync";

function lireDerniereSynchronisation(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  if (stored) return stored;
  const now = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, now);
  return now;
}

// FR-OFF-02 : indicateur de fraîcheur des données, visible dès que l'app est hors-ligne.
export function useSyncStatus() {
  const [enLigne, setEnLigne] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [derniereSynchronisation, setDerniereSynchronisation] = useState<string | null>(
    lireDerniereSynchronisation
  );

  useEffect(() => {
    function handleOnline() {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      setDerniereSynchronisation(now);
      setEnLigne(true);
    }
    function handleOffline() {
      setEnLigne(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { enLigne, derniereSynchronisation };
}
