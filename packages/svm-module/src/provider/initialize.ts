import { registerWallet } from './register';
import { StandardWallet } from './wallet';
import type { Connection } from './window';

export function initialize(connection: Connection): void {
  registerWallet(new StandardWallet(connection));
}
