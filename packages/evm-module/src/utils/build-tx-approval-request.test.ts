import { Interface } from 'ethers';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import {
  RpcMethod,
  type AgentIdentity,
  type Network,
  type RpcRequest,
  type TransactionSimulationResult,
} from '@avalabs/vm-module-types';

import { addressItem, linkItem, networkItem, textItem } from '@internal/utils/src/utils/detail-item';

import { buildTxApprovalRequest } from './build-tx-approval-request';
import { EERC_ABI } from './eerc-abi';
import type { TransactionParams } from './transaction-schema';

const iface = new Interface(ERC20.abi);
const eercIface = new Interface(EERC_ABI);

const FROM = '0x0000000000000000000000000000000000000001';
const TO_EOA = '0x0000000000000000000000000000000000000002';
const TOKEN_CONTRACT = '0x0000000000000000000000000000000000000003';
const RECIPIENT = '0x0000000000000000000000000000000000000004';

const network = {
  chainId: 1,
  chainName: 'Ethereum',
  logoUri: 'logoUri',
} as unknown as Network;

const dappInfo = { url: 'https://example.com', name: 'dapp', icon: 'icon' };
const request = { dappInfo } as unknown as RpcRequest;

const emptyScan = {} as TransactionSimulationResult;

const baseItems = [
  addressItem('Account', FROM),
  networkItem('Network', { name: network.chainName, logoUri: network.logoUri }),
  linkItem('Website', dappInfo),
];

const getDetails = (transaction: TransactionParams, agentIdentity?: AgentIdentity) =>
  buildTxApprovalRequest(request, network, transaction, emptyScan, agentIdentity).displayData.details;

const getFirstSectionItems = (transaction: TransactionParams) => getDetails(transaction)[0]!.items;

describe('buildTxApprovalRequest', () => {
  describe('transaction details layout', () => {
    it('shows only the recipient (To) for a native transfer', () => {
      const transaction = { from: FROM, to: TO_EOA, value: '0x1' } as TransactionParams;

      expect(getFirstSectionItems(transaction)).toEqual([...baseItems, addressItem('To', TO_EOA)]);
    });

    it('shows the decoded recipient (To) and the token Contract for an ERC20 transfer', () => {
      const data = iface.encodeFunctionData('transfer', [RECIPIENT, 1000n]);
      const transaction = { from: FROM, to: TOKEN_CONTRACT, data } as TransactionParams;

      expect(getFirstSectionItems(transaction)).toEqual([
        ...baseItems,
        addressItem('To', RECIPIENT),
        addressItem('Contract', TOKEN_CONTRACT),
      ]);
    });

    it('shows only the Contract (no To) for a generic contract call', () => {
      const transaction = { from: FROM, to: TOKEN_CONTRACT, data: '0xdeadbeef' } as TransactionParams;

      expect(getFirstSectionItems(transaction)).toEqual([...baseItems, addressItem('Contract', TOKEN_CONTRACT)]);
    });
  });

  describe('title', () => {
    it('uses the default approval title for a native transfer', () => {
      const transaction = { from: FROM, to: TO_EOA, value: '0x1' } as TransactionParams;

      const { displayData } = buildTxApprovalRequest(request, network, transaction, emptyScan);

      expect(displayData.title).toBe('Do you approve this transaction?');
    });

    it('uses the spend-limit title for an ERC20 approve', () => {
      const data = iface.encodeFunctionData('approve', [RECIPIENT, 1000n]);
      const transaction = { from: FROM, to: TOKEN_CONTRACT, data } as TransactionParams;

      const { displayData } = buildTxApprovalRequest(request, network, transaction, emptyScan);

      expect(displayData.title).toBe('Do you approve this spend limit?');
      // approve is not a transfer, so it is treated as a contract call (no `To`)
      expect(displayData.details[0]!.items).toEqual([...baseItems, addressItem('Contract', TOKEN_CONTRACT)]);
    });
  });

  describe('eERC Operation/Privacy rows', () => {
    const eercDepositData = eercIface.encodeFunctionData('deposit(uint256,address,uint256[7])', [
      1n,
      TOKEN_CONTRACT,
      new Array(7).fill(0n),
    ]);

    it('appends Operation and Privacy rows for an eERC tx when the flag is enabled', () => {
      const transaction = { from: FROM, to: TOKEN_CONTRACT, data: eercDepositData } as TransactionParams;

      const items = buildTxApprovalRequest(request, network, transaction, emptyScan, undefined, true).displayData
        .details[0]!.items;

      expect(items).toEqual([
        ...baseItems,
        addressItem('Contract', TOKEN_CONTRACT),
        textItem('Operation', 'deposit'),
        textItem('Privacy', 'eERC20'),
      ]);
    });

    it('does not append the rows when the flag is disabled (default)', () => {
      const transaction = { from: FROM, to: TOKEN_CONTRACT, data: eercDepositData } as TransactionParams;

      const items = getFirstSectionItems(transaction);

      expect(items).toEqual([...baseItems, addressItem('Contract', TOKEN_CONTRACT)]);
    });

    it('does not append the rows for a non-eERC tx even when the flag is enabled', () => {
      const transaction = { from: FROM, to: TO_EOA, value: '0x1' } as TransactionParams;

      const items = buildTxApprovalRequest(request, network, transaction, emptyScan, undefined, true).displayData
        .details[0]!.items;

      expect(items).toEqual([...baseItems, addressItem('To', TO_EOA)]);
    });
  });

  describe('agent identity', () => {
    const agentIdentity: AgentIdentity = {
      agentId: '1599',
      agentRegistry: 'eip155:43114:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      owner: '0x1234567890123456789012345678901234567890',
      reputationScore: 88,
      metadataUri: 'ipfs://agent.json',
      trustLevel: 'high',
    };

    it('appends an Agent Identity section when an agent identity is provided', () => {
      const transaction = { from: FROM, to: TO_EOA, value: '0x1' } as TransactionParams;

      const details = getDetails(transaction, agentIdentity);

      expect(details).toHaveLength(2);
      expect(details[1]).toEqual(expect.objectContaining({ title: 'Agent Identity' }));
    });

    it('does not append an Agent Identity section when none is provided', () => {
      const transaction = { from: FROM, to: TO_EOA, value: '0x1' } as TransactionParams;

      const details = getDetails(transaction);

      expect(details).toHaveLength(1);
    });
  });

  describe('signing data', () => {
    it('builds EIP-1559 signing data from the transaction', () => {
      const transaction = {
        from: FROM,
        to: TO_EOA,
        data: '0xdata',
        value: '0xvalue',
        nonce: '12',
        gas: '0x5208',
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x2',
        accessList: [{ address: '0x123', storageKeys: ['0xkey1'] }],
      } as TransactionParams;

      const { signingData } = buildTxApprovalRequest(request, network, transaction, emptyScan);

      expect(signingData).toEqual({
        type: RpcMethod.ETH_SEND_TRANSACTION,
        account: FROM,
        data: {
          type: 2,
          nonce: 12,
          gasLimit: 21000,
          maxFeePerGas: '0x1',
          maxPriorityFeePerGas: '0x2',
          to: TO_EOA,
          from: FROM,
          data: '0xdata',
          value: '0xvalue',
          chainId: network.chainId,
          accessList: [{ address: '0x123', storageKeys: ['0xkey1'] }],
        },
      });
    });

    it('falls back to the network chainId when the transaction has none', () => {
      const transaction = { from: FROM, to: TO_EOA, value: '0x1', nonce: '1', gas: '0x5208' } as TransactionParams;

      const { signingData } = buildTxApprovalRequest(request, network, transaction, emptyScan);

      expect((signingData.data as { chainId: number }).chainId).toBe(network.chainId);
    });
  });
});
