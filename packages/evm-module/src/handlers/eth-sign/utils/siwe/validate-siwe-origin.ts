import type { SiweMessage } from './parse-siwe-message';

export type SiweOriginMismatch = {
  domainMismatch: boolean;
  uriMismatch: boolean;
  /** Human readable explanation of every mismatch found. */
  reasons: string[];
};

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
  'ws:': '80',
  'wss:': '443',
};

/**
 * Parses a URL, treating a value without a scheme as an https authority (e.g. "example.com:8080").
 */
export const safeParseUrl = (value: string | undefined): URL | undefined => {
  if (!value) return undefined;

  try {
    return new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    return undefined;
  }
};

const normalizeHost = (hostname: string): string => hostname.toLowerCase().replace(/\.$/, '');

const effectivePort = (url: URL, schemeForDefault = url.protocol): string =>
  url.port || DEFAULT_PORTS[schemeForDefault] || '';

/**
 * EIP-4361 defines `domain` as an RFC 3986 authority (host plus optional port, optionally prefixed by a scheme),
 * so it has to match the requesting origin's host *and* port exactly: a subdomain, parent domain, lookalike
 * suffix or a different port is a different authority. A domain without a port implies the default port of the
 * dApp's scheme (or of its own scheme, if a scheme prefix was included).
 */
export const isSiweDomainMismatch = (domain: string, dappOrigin: URL): boolean => {
  const hasScheme = domain.includes('://');
  const parsedDomain = safeParseUrl(domain);

  // Not a parseable authority at all.
  if (!parsedDomain) return true;

  // Userinfo ("victim.com@attacker.com") is not a meaningful SIWE domain and only makes the displayed domain
  // misleading. A path, query or fragment is not part of an authority either.
  if (parsedDomain.username || parsedDomain.password) return true;
  if (/[/\\?#]/.test(stripScheme(domain))) return true;

  if (normalizeHost(parsedDomain.hostname) !== normalizeHost(dappOrigin.hostname)) return true;

  if (hasScheme && parsedDomain.protocol !== dappOrigin.protocol) return true;

  const domainPort = effectivePort(parsedDomain, hasScheme ? parsedDomain.protocol : dappOrigin.protocol);

  return domainPort !== effectivePort(dappOrigin);
};

const stripScheme = (value: string): string => value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');

/**
 * The SIWE `URI` must point at the same origin (scheme, host and port) as the requesting dApp.
 */
export const isSiweUriMismatch = (uri: string, dappOrigin: URL): boolean => {
  const parsedUri = safeParseUrl(uri);
  if (!parsedUri) return true;

  return (
    parsedUri.protocol !== dappOrigin.protocol ||
    normalizeHost(parsedUri.hostname) !== normalizeHost(dappOrigin.hostname) ||
    effectivePort(parsedUri) !== effectivePort(dappOrigin)
  );
};

const formatOrigin = (url: URL): string => (url.protocol === 'https:' ? url.host : `${url.protocol}//${url.host}`);

/**
 * Compares a parsed SIWE message against the verified origin of the requesting dApp.
 *
 * Returns `undefined` when they match, or when the dApp origin is missing / unparseable: without a trustworthy
 * origin there is nothing to compare against, and raising a mismatch for every sign-in would only train users
 * to ignore the warning. Consumers must pass the verified origin as `dappInfo.url` for this check to work.
 */
export const validateSiweOrigin = (siwe: SiweMessage, dappUrl: string | undefined): SiweOriginMismatch | undefined => {
  const dappOrigin = safeParseUrl(dappUrl);
  if (!dappOrigin || !dappOrigin.hostname) return undefined;

  const domainMismatch = isSiweDomainMismatch(siwe.domain, dappOrigin);
  const uriMismatch = isSiweUriMismatch(siwe.uri, dappOrigin);

  if (!domainMismatch && !uriMismatch) return undefined;

  const reasons: string[] = [];
  if (domainMismatch) {
    reasons.push(`Domain "${siwe.domain}" doesn't match the dApp origin "${dappOrigin.host}".`);
  }
  if (uriMismatch) {
    reasons.push(`URI "${siwe.uri}" doesn't match the dApp origin "${formatOrigin(dappOrigin)}".`);
  }

  return { domainMismatch, uriMismatch, reasons };
};
