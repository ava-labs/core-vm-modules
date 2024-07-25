import type { TokenWithBalance, TokenWithBalanceAVM, TokenWithBalancePVM } from '@avalabs/vm-module-types';

export const isTokenWithBalancePVM = (token: TokenWithBalance): token is TokenWithBalancePVM => {
  return 'balancePerType' in token && 'unlockedUnstaked' in token.balancePerType;
};

export const isTokenWithBalanceAVM = (token: TokenWithBalance): token is TokenWithBalanceAVM => {
  return 'balancePerType' in token && 'unlocked' in token.balancePerType;
};
