import { Bell, CheckCircle2, Clock, XCircle } from "lucide-react";
import { apiFetchServer } from "@/lib/api-server";
import { Badge } from "@/components/ui/StatusBadge";
import type { NotificationItem, TypeNotification } from "@/lib/types";

const ICONES: Record<TypeNotification, typeof Bell> = {
  modifie: Clock,
  annule: XCircle,
  info: CheckCircle2,
};

const BADGES: Record<TypeNotification, { label: string; tone: "warning" | "danger" | "success" }> = {
  modifie: { label: "Modifié", tone: "warning" },
  annule: { label: "Annulé", tone: "danger" },
  info: { label: "Info", tone: "success" },
};

function formatHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export default async function NotificationsEtudiantPage() {
  const reponse = await apiFetchServer("/notifications");
  const { notifications }: { notifications: NotificationItem[] } = reponse.ok
    ? await reponse.json()
    : { notifications: [] };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Notifications</h1>
          <p className="text-sm text-text-muted">Mises à jour et alertes du système</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">
          Aujourd&apos;hui
        </div>
        {notifications.map((notification) => {
          const Icon = ICONES[notification.type];
          const badge = BADGES[notification.type];
          return (
            <div
              key={notification.id}
              className="flex items-start gap-3 border-b border-border px-4 py-4 last:border-b-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-muted">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-text">{notification.titre}</h2>
                  <span className="shrink-0 text-xs text-text-subtle">
                    {formatHeure(notification.dateHeure)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-text-muted">{notification.description}</p>
                <div className="mt-2">
                  <Badge tone={badge.tone} label={badge.label} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
