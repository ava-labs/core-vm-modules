import type { SolanaProvider } from '@avalabs/core-wallets-sdk';
import type { Network } from '@avalabs/vm-module-types';
import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

import { assertTxBelongsToNetwork } from './assert-tx-belongs-to-network';

// A minimal v0 transaction whose lifetime is BLOCKHASH below.
const SERIALIZED_TX =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAQKo9pFOiKGw4hAVPvdjrisAwrk9FsEk0sBTehAEgAAA3fS9Owj8B10Abix46FXAI/UfwKL0rpcbksjQ4hzpymIAAA=';
const BLOCKHASH = 'FwRYtTPRk5NfqNsQBJTZFy1phFPo2VmbjnZ3AtDrDwK7';
const NONCE_ACCOUNT = '11111111111111111111111111111113';

const network = { chainName: 'Solana Devnet' } as unknown as Network;

const asSend = <T>(result: T | Error) =>
  jest.fn().mockReturnValue({
    send: result instanceof Error ? jest.fn().mockRejectedValue(result) : jest.fn().mockResolvedValue(result),
  });

const buildProvider = ({
  blockhashValid,
  accountInfo,
}: {
  blockhashValid?: { value: boolean } | Error;
  accountInfo?: unknown;
} = {}): SolanaProvider =>
  ({
    isBlockhashValid: asSend(blockhashValid ?? { value: true }),
    getAccountInfo: asSend(accountInfo),
  }) as unknown as SolanaProvider;

const nonceAccountInfo = (blockhash: unknown) => ({
  value: { data: { parsed: { info: { blockhash } } } },
});

const buildDurableNonceTx = (): string => {
  const payer = new PublicKey('11111111111111111111111111111112');
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: BLOCKHASH,
    instructions: [SystemProgram.nonceAdvance({ noncePubkey: new PublicKey(NONCE_ACCOUNT), authorizedPubkey: payer })],
  }).compileToV0Message();

  return Buffer.from(new VersionedTransaction(message).serialize()).toString('base64');
};

describe('assertTxBelongsToNetwork', () => {
  describe('blockhash transactions', () => {
    it('returns null when the blockhash belongs to the cluster', async () => {
      const provider = buildProvider({ blockhashValid: { value: true } });

      expect(await assertTxBelongsToNetwork({ serializedTx: SERIALIZED_TX, provider, network })).toBeNull();
      expect(provider.isBlockhashValid).toHaveBeenCalledWith(BLOCKHASH);
    });

    it('flags expiry and cross-cluster when the blockhash is not valid on the target cluster', async () => {
      const provider = buildProvider({ blockhashValid: { value: false } });

      const result = await assertTxBelongsToNetwork({ serializedTx: SERIALIZED_TX, provider, network });

      expect(result).toContain('blockhash is not valid on Solana Devnet');
      expect(result).toContain('may have expired');
    });

    it('fails closed when the blockhash cannot be checked', async () => {
      const provider = buildProvider({ blockhashValid: new Error('network down') });

      const result = await assertTxBelongsToNetwork({ serializedTx: SERIALIZED_TX, provider, network });

      expect(result).toContain('Could not verify');
    });
  });

  describe('durable-nonce transactions', () => {
    it('returns null when the stored nonce matches on the target cluster', async () => {
      const provider = buildProvider({ accountInfo: nonceAccountInfo(BLOCKHASH) });

      expect(await assertTxBelongsToNetwork({ serializedTx: buildDurableNonceTx(), provider, network })).toBeNull();
      expect(provider.getAccountInfo).toHaveBeenCalledWith(NONCE_ACCOUNT, { encoding: 'jsonParsed' });
      expect(provider.isBlockhashValid).not.toHaveBeenCalled();
    });

    it('flags expiry and cross-cluster when the stored nonce does not match', async () => {
      const provider = buildProvider({ accountInfo: nonceAccountInfo('SomeOtherNonceValue1111111111111111111111') });

      const result = await assertTxBelongsToNetwork({ serializedTx: buildDurableNonceTx(), provider, network });

      expect(result).toContain('durable nonce is not valid on Solana Devnet');
    });

    it('fails closed when the nonce account is unknown on the target cluster', async () => {
      const provider = buildProvider({ accountInfo: { value: null } });

      const result = await assertTxBelongsToNetwork({ serializedTx: buildDurableNonceTx(), provider, network });

      expect(result).toContain('durable nonce account is unknown on Solana Devnet');
    });

    it('fails closed when the nonce account data cannot be parsed', async () => {
      const provider = buildProvider({ accountInfo: { value: { data: ['deadbeef', 'base64'] } } });

      const result = await assertTxBelongsToNetwork({ serializedTx: buildDurableNonceTx(), provider, network });

      expect(result).toContain('Could not verify');
    });

    it('fails closed when the nonce account cannot be fetched', async () => {
      const provider = buildProvider();
      jest.mocked(provider.getAccountInfo).mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('network down')),
      } as unknown as ReturnType<SolanaProvider['getAccountInfo']>);

      const result = await assertTxBelongsToNetwork({ serializedTx: buildDurableNonceTx(), provider, network });

      expect(result).toContain('Could not verify');
    });
  });

  it('fails closed when the payload cannot be decoded', async () => {
    const provider = buildProvider();

    const result = await assertTxBelongsToNetwork({ serializedTx: 'not-base64-@@@', provider, network });

    expect(result).toContain('Could not verify');
    expect(provider.isBlockhashValid).not.toHaveBeenCalled();
    expect(provider.getAccountInfo).not.toHaveBeenCalled();
  });
});
