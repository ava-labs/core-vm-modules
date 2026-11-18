import { AlertType, type Alert } from '@avalabs/vm-module-types';
import { getBytes, toUtf8String } from 'ethers';
import { parseSiweMessageStrict } from './parse-siwe-message';
import { validateSiweOrigin } from './validate-siwe-origin';

export const SIWE_MISMATCH_TITLE = 'Sign-In Request Mismatch';
export const SIWE_MALFORMED_TITLE = 'Malformed Sign-In Request';

const PHISHING_WARNING = 'This could be a phishing attempt. Proceed with caution.';

const HEX_REGEX = /^0x[0-9a-fA-F]*$/;

/**
 * Decodes a personal_sign payload into the text the user is actually signing.
 *
 * Mirrors what gets signed: a 0x-prefixed hex string is hex-decoded, any other string is signed as UTF-8 text
 * (decoding plain text as hex would hide a SIWE payload). Hex that is not valid UTF-8 cannot be a SIWE message,
 * so it returns undefined instead of a lossy decode.
 */
export const decodePersonalSignMessage = (data: unknown): string | undefined => {
  if (typeof data !== 'string' || data.length === 0) return undefined;
  if (!HEX_REGEX.test(data)) return data;

  const hex = data.length % 2 === 0 ? data : `0x0${data.slice(2)}`;

  try {
    // ethers' toUtf8String throws on invalid UTF-8 (overlong, surrogates, truncated sequences, ...).
    return toUtf8String(getBytes(hex));
  } catch {
    return undefined;
  }
};

/**
 * Returns a DANGER alert when a personal_sign payload is a Sign-In with Ethereum (EIP-4361) message whose
 * domain / URI does not match the requesting dApp's origin, or when it looks like SIWE but is malformed.
 * Returns undefined for anything else (not SIWE, matching origin, or no verifiable dApp origin).
 */
export const getSiweAlert = ({ data, dappUrl }: { data: unknown; dappUrl: string | undefined }): Alert | undefined => {
  const message = decodePersonalSignMessage(data);
  if (!message) return undefined;

  const parsed = parseSiweMessageStrict(message);
  if (!parsed) return undefined;

  // A SIWE header with a malformed or ambiguous body must never be signed silently: the fields the user reads
  // could differ from what a lenient backend parser sees.
  if (parsed.kind === 'malformed') {
    return {
      type: AlertType.DANGER,
      details: {
        title: SIWE_MALFORMED_TITLE,
        description: 'This sign-in message is not formatted as a valid Sign-In with Ethereum request. Do not sign it.',
      },
    };
  }

  const mismatch = validateSiweOrigin(parsed.message, dappUrl);
  if (!mismatch) return undefined;

  return {
    type: AlertType.DANGER,
    details: {
      title: SIWE_MISMATCH_TITLE,
      // Keep the reasons in the description so they survive mergeAlerts (which folds a secondary alert into
      // "title: description").
      description: `${mismatch.reasons.join(' ')} ${PHISHING_WARNING}`,
    },
  };
};
