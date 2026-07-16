const METHOD_PREFIX = 'hypercoreFill:v1:';

export type HypercoreFillMeta = {
  /** Fill side / action from Hyperliquid (`Open Long`, `Close Short`, …). */
  readonly dir: string;
  /** Fill price as a decimal string (Hyperliquid `px`). */
  readonly px: string;
  /** Realized PnL for the fill as a decimal string; `"0"` when none. */
  readonly closedPnl: string;
  /** Market coin id (`ETH`, or HIP-3 `dex:TICKER`). */
  readonly coin: string;
};

export type FillLabel = {
  readonly text: string;
  /** Long / short cue for the UI to pick an icon. */
  readonly direction?: 'up' | 'down';
  readonly tone?: 'profit' | 'loss';
};

/** Display ticker with any `dex:` prefix stripped (`xyz:GOLD` → `GOLD`). */
export const tickerOfCoin = (coin: string) => {
  const i = coin.indexOf(':');
  return i === -1 ? coin : coin.slice(i + 1);
};

/** PnL tone from `closedPnl` — `dir` alone does not indicate profit vs loss. */
export const closedPnlTone = (closedPnl: string | undefined): 'profit' | 'loss' | undefined => {
  if (closedPnl === undefined) {
    return undefined;
  }
  const n = Number.parseFloat(closedPnl);
  if (!Number.isFinite(n) || n === 0) {
    return undefined;
  }
  return n > 0 ? 'profit' : 'loss';
};

/**
 * Map a fill's `dir` into a display label. Direction follows side
 * (long → up / short → down); success/error tone comes from `closedPnl` when provided.
 */
export const fillLabel = (dir: string, closedPnl?: string): FillLabel => {
  const tone = closedPnlTone(closedPnl);
  const d = dir.toLowerCase();
  if (d.includes('close') && d.includes('long')) {
    return { text: 'Long closed', direction: 'up', tone };
  }
  if (d.includes('close') && d.includes('short')) {
    return { text: 'Short closed', direction: 'down', tone };
  }
  if (d.includes('open') && (d.includes('long') || d.includes('short'))) {
    return { text: 'Order opened' };
  }
  if (d.includes('cancel')) {
    return { text: 'Order cancelled' };
  }
  return { text: dir };
};

/** Compact USD price for fill rows (`$1,684.7`). */
export const formatHypercoreFillPx = (px: string) => {
  const n = Number.parseFloat(px);
  if (!Number.isFinite(n)) {
    return px;
  }
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
};

export const encodeHypercoreFillMethod = (meta: HypercoreFillMeta) =>
  `${METHOD_PREFIX}${encodeURIComponent(JSON.stringify(meta))}`;

export const parseHypercoreFillMethod = (method: string | undefined): HypercoreFillMeta | undefined => {
  if (!method?.startsWith(METHOD_PREFIX)) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(method.slice(METHOD_PREFIX.length)));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('dir' in parsed) ||
      !('px' in parsed) ||
      !('closedPnl' in parsed) ||
      !('coin' in parsed)
    ) {
      return undefined;
    }
    const { dir, px, closedPnl, coin } = parsed as Record<string, unknown>;
    if (
      typeof dir !== 'string' ||
      typeof px !== 'string' ||
      typeof closedPnl !== 'string' ||
      typeof coin !== 'string'
    ) {
      return undefined;
    }
    return { dir, px, closedPnl, coin };
  } catch {
    return undefined;
  }
};
