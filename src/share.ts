/**
 * The address a QR code should point at.
 *
 * On the deployed site that is the visitor's own origin, so the QR stays correct on a
 * custom domain without anyone regenerating it. On a local development host that would
 * encode `localhost`, which no phone can reach, so the canonical public address is used.
 */

export const CANONICAL_URL = 'https://peter-cui-workbench.pages.dev/'

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i

export function shareTarget(href: string): string {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return CANONICAL_URL
  }
  if (LOCAL_HOSTS.test(url.hostname) || url.hostname.endsWith('.local')) return CANONICAL_URL
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return CANONICAL_URL
  return `${url.origin}/`
}
