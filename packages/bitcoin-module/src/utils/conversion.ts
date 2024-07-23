import Big from 'big.js';

export function btcToSatoshi(btc: Big): number {
  return btc.mul(100_000_000).toNumber();
}

export function satoshiToBtc(satoshis: number): Big {
  return new Big(satoshis).div(100_000_000);
}
