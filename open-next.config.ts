import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Todas las páginas leen la base en cada request: no hace falta caché incremental.
export default defineCloudflareConfig({});
