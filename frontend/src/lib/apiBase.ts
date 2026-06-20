const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/** Builds an API URL. When VITE_API_BASE_URL is empty, the Vite dev proxy handles /api. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${RAW_BASE}${normalized}`
}
