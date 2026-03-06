/**
 * Normalises a user-supplied URL for use in an <a href>.
 *
 * - Prepends https:// if no scheme is present.
 * - Returns '#' for empty, unparseable, or non-http(s) URLs so that
 *   javascript:, data:, vbscript:, and similar schemes never reach the DOM.
 */
export function safeHref(url) {
  if (!url) return '#';
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : '#';
  } catch {
    return '#';
  }
}
