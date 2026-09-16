import type { SolanaProvider } from '@avalabs/core-wallets-sdk';
import type { Network } from '@avalabs/vm-module-types';
import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

import { assertTxBelongsToNetwork } from './assert-tx-belongs-to-network';

// A minimal v0 transaction whose lifetime is BLOCKHASH below.
const SERIALIZED_TX =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAQKo9pFOiKGw4hAVPvdjrisAwrk9FsEk0sBTehAEgAAA3fS9Owj8B10Abix46FXAI/UfwKL0rpcbksjQ4hzpymIAAA=';
const BLOCKHASH = 'FwRYtTPRk5NfqNsQBJTZFy1phFPo2VmbjnZ3AtDrDwK7';

const network = { chainName: 'Solana Devnet' } as unknown as Network;

const providerReturning = (result: { value: boolean } | Error): SolanaProvider =>
  ({
    isBlockhashValid: jest.fn().mockReturnValue({
      send: result instanceof Error ? jest.fn().mockRejectedValue(result) : jest.fn().mockResolvedValue(result),
    }),
  }) as unknown as SolanaProvider;

describe('assertTxBelongsToNetwork', () => {
  it('returns an error when the blockhash is unknown on the target cluster', async () => {
    const provider = providerReturning({ value: false });

    const result = await assertTxBelongsToNetwork({ serializedTx: SERIALIZED_TX, provider, network });

    expect(result).toContain('was not built for Solana Devnet');
    expect(provider.isBlockhashValid).toHaveBeenCalledWith(BLOCKHASH);
  });

  it('returns null when the blockhash belongs to the cluster', async () => {
    const provider = providerReturning({ value: true });

    expect(await assertTxBelongsToNetwork({ serializedTx: SERIALIZED_TX, provider, network })).toBeNull();
  });

  it('fails open (null) when the blockhash cannot be checked', async () => {
    const provider = providerReturning(new Error('network down'));

    expect(await assertTxBelongsToNetwork({ serializedTx: SERIALIZED_TX, provider, network })).toBeNull();
  });

  it('fails open (null) when the payload cannot be decoded', async () => {
    const provider = providerReturning({ value: false });

    expect(await assertTxBelongsToNetwork({ serializedTx: 'not-base64-@@@', provider, network })).toBeNull();
    expect(provider.isBlockhashValid).not.toHaveBeenCalled();
  });

  it('skips durable-nonce transactions (no blockhash check)', async () => {
    const payer = new PublicKey('11111111111111111111111111111112');
    const nonceAccount = new PublicKey('11111111111111111111111111111113');
    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: BLOCKHASH,
      instructions: [SystemProgram.nonceAdvance({ noncePubkey: nonceAccount, authorizedPubkey: payer })],
    }).compileToV0Message();
    const nonceTx = Buffer.from(new VersionedTransaction(message).serialize()).toString('base64');

    const provider = providerReturning({ value: false });

    expect(await assertTxBelongsToNetwork({ serializedTx: nonceTx, provider, network })).toBeNull();
    expect(provider.isBlockhashValid).not.toHaveBeenCalled();
  });
});
