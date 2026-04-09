/**
 * Builds the options object for `rpcErrors.internal()` / `rpcErrors.invalidParams()` etc.
 * Ensures the actual error message appears in the top-level `message` field,
 * which is what viem exposes as `error.details` to dapps.
 */
export const rpcErrorOpts = (message: string, cause: unknown) => ({
  message: `${message}${
    cause instanceof Error
      ? `: ${cause.message}`
      : typeof cause === 'string'
      ? `: ${cause}`
      : cause
      ? `: ${String(cause)}`
      : ''
  }`,
  data: { cause },
});
