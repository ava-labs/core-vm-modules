/**
 * Self-contained, strict EIP-4361 (Sign-In with Ethereum) message parser.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-4361
 *
 * ${scheme}:// is optional in front of ${domain}
 *
 * ${domain} wants you to sign in with your Ethereum account:\n
 * ${address}\n
 * \n
 * ${statement (optional, single line)}\n
 * \n
 * URI: ${uri}\n
 * Version: ${version}\n
 * Chain ID: ${chain-id}\n
 * Nonce: ${nonce}\n
 * Issued At: ${issued-at}\n
 * [Expiration Time: ...]\n
 * [Not Before: ...]\n
 * [Request ID: ...]\n
 * [Resources:\n- ...\n- ...]
 */

export type SiweMessage = {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  statement?: string;
  expirationTime?: string;
  notBefore?: string;
  /** '' when the line is present with an empty value (allowed by EIP-4361). */
  requestId?: string;
  resources?: string[];
};

type FieldValueError =
  | 'invalid URI'
  | 'unsupported version'
  | 'invalid chain id'
  | 'invalid nonce'
  | 'invalid timestamp';

export type SiweMalformedReason =
  | 'unsupported line separator'
  | 'unexpected layout'
  | 'invalid or ambiguous fields'
  | FieldValueError;

export type SiweParseResult = { kind: 'ok'; message: SiweMessage } | { kind: 'malformed'; reason: SiweMalformedReason };

// The header line is matched with an optional "\r" so that a CRLF message is recognised as SIWE
// (and then rejected as malformed below) instead of silently being treated as a plain message.
const SIWE_HEADER_REGEX =
  /^(?<domain>[^ ]+) wants you to sign in with your Ethereum account:\r?\n(?<address>0x[a-fA-F0-9]{40})\r?\n/;

// Line separators other than "\n" that some renderers treat as a line break (CR, VT, FF, NEL, LS, PS).
// Any of them lets a fake field hide from a strict "\n"-only parser while still looking like a new line to the user.
const FORBIDDEN_SEPARATORS = ['\r', '\v', '\f', '\u0085', '\u2028', '\u2029'];

const REQUIRED_FIELDS = ['URI', 'Version', 'Chain ID', 'Nonce', 'Issued At'] as const;
const OPTIONAL_FIELDS = ['Expiration Time', 'Not Before', 'Request ID'] as const;
const TIMESTAMP_FIELDS = ['Issued At', 'Expiration Time', 'Not Before'] as const;

// EIP-4361 ABNF (nonce = 8*( ALPHA / DIGIT )) plus the URL-safe '-' and '_' used by UUID and base64url nonces.
const NONCE_REGEX = /^[a-zA-Z0-9_-]{8,}$/;
const CHAIN_ID_REGEX = /^\d+$/;
// RFC 3339 date-time, as required for the timestamp fields.
const RFC3339_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const malformed = (reason: SiweMalformedReason): SiweParseResult => ({ kind: 'malformed', reason });

/**
 * Strict EIP-4361 parse.
 *
 * - `undefined`: the message is not SIWE at all (the header does not match).
 * - `{ kind: 'malformed' }`: the header matches but the body is malformed or ambiguous, so the fields a user
 *   reads could differ from what a lenient backend parser sees. Callers should warn rather than treat it as
 *   a plain message.
 * - `{ kind: 'ok' }`: a well-formed SIWE message.
 */
export const parseSiweMessageStrict = (message: string): SiweParseResult | undefined => {
  const headerMatch = SIWE_HEADER_REGEX.exec(message);
  if (!headerMatch?.groups) return undefined;

  if (FORBIDDEN_SEPARATORS.some((separator) => message.includes(separator))) {
    return malformed('unsupported line separator');
  }

  const { domain, address } = headerMatch.groups as { domain: string; address: string };

  const sections = splitStatementAndFields(message.slice(headerMatch[0].length));
  if (!sections) return malformed('unexpected layout');

  const parsed = parseFields(sections.fields);
  if (!parsed.ok) return malformed(parsed.reason);
  const { fields } = parsed;

  return {
    kind: 'ok',
    message: {
      domain,
      address,
      statement: sections.statement || undefined,
      uri: fields.URI as string,
      version: fields.Version as string,
      chainId: fields['Chain ID'] as string,
      nonce: fields.Nonce as string,
      issuedAt: fields['Issued At'] as string,
      expirationTime: fields['Expiration Time'],
      notBefore: fields['Not Before'],
      requestId: fields['Request ID'],
      resources: fields.resources,
    },
  };
};

export const parseSiweMessage = (message: string): SiweMessage | undefined => {
  const result = parseSiweMessageStrict(message);
  return result?.kind === 'ok' ? result.message : undefined;
};

// `afterAddress` starts right after the address line's "\n".
// EIP-4361: address LF LF [statement] LF fields. The lenient form without the extra LF is also accepted
// when the statement is omitted (some libraries emit it).
const splitStatementAndFields = (afterAddress: string): { statement?: string; fields: string } | undefined => {
  if (!afterAddress.startsWith('\n')) return undefined;
  const rest = afterAddress.slice(1);

  if (rest.startsWith('URI: ')) return { fields: rest };
  if (rest.startsWith('\nURI: ')) return { fields: rest.slice(1) };

  const index = rest.indexOf('\n\nURI: ');
  if (index === -1) return undefined;

  const statement = rest.slice(0, index);
  // An EIP-4361 statement has no newlines; a multi-line one is how a fake "URI:" line gets ahead of the
  // real structured section.
  if (statement.includes('\n')) return undefined;

  return { statement: statement.trim(), fields: rest.slice(index + 2) };
};

type ParsedFields = Record<string, string | undefined> & { resources?: string[] };

type FieldsResult = { ok: true; fields: ParsedFields } | { ok: false; reason: SiweMalformedReason };

const INVALID_FIELDS: FieldsResult = { ok: false, reason: 'invalid or ambiguous fields' };

const hasScheme = (uri: string): boolean => {
  try {
    return new URL(uri).protocol.length > 0;
  } catch {
    return false;
  }
};

const validateFieldValues = (fields: ParsedFields): FieldValueError | undefined => {
  if (!hasScheme(fields.URI as string)) return 'invalid URI';
  if (fields.Version !== '1') return 'unsupported version';
  if (!CHAIN_ID_REGEX.test(fields['Chain ID'] as string)) return 'invalid chain id';
  if (!NONCE_REGEX.test(fields.Nonce as string)) return 'invalid nonce';

  for (const label of TIMESTAMP_FIELDS) {
    const value = fields[label];
    if (value !== undefined && !RFC3339_REGEX.test(value)) return 'invalid timestamp';
  }

  return undefined;
};

const isResourceLine = (line: string): boolean => line.startsWith('- ') && line.slice(2).trim().length > 0;

// undefined: not this field (the ABNF requires the space after the colon). '': present with an empty value.
const readField = (line: string | undefined, label: string): string | undefined => {
  const prefix = `${label}: `;
  if (line === undefined || !line.startsWith(prefix)) return undefined;
  return line.slice(prefix.length).trim();
};

const parseFields = (section: string): FieldsResult => {
  const lines = section.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();

  const out: ParsedFields = {};
  let index = 0;

  for (const label of REQUIRED_FIELDS) {
    const value = readField(lines[index], label);
    if (!value) return INVALID_FIELDS;
    out[label] = value;
    index++;
  }

  for (const label of OPTIONAL_FIELDS) {
    const value = readField(lines[index], label);
    // A present-but-empty optional field still consumes its line; empty timestamps are rejected later.
    if (value !== undefined) {
      out[label] = value;
      index++;
    }
  }

  if (lines[index] === 'Resources:') {
    const resources = lines.slice(index + 1);
    // EIP-4361 allows zero resources; any non-resource line after "Resources:" is malformed.
    if (!resources.every(isResourceLine)) return INVALID_FIELDS;
    out.resources = resources.map((line) => line.slice(2).trim());
    index = lines.length;
  }

  if (index !== lines.length) return INVALID_FIELDS;

  const reason = validateFieldValues(out);
  return reason ? { ok: false, reason } : { ok: true, fields: out };
};
