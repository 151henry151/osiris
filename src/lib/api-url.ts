/** Base path when hosted under e.g. https://hromp.com/osiris */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefix internal API paths for subpath deployments. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
