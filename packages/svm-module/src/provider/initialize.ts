import { registerWallet } from './register';
import { StandardWallet } from './wallet';
import type { Connection } from './window';

export function initialize(core: Connection): void {
  registerWallet(new StandardWallet(core));
}
