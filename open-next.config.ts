import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config minimale : aucune route ne dépend du cache incrémental de Next
// (ISR/generateStaticParams) — tout est soit public et dynamique (SSR),
// soit authentifié — donc pas de bucket R2 à provisionner pour démarrer.
export default defineCloudflareConfig();
