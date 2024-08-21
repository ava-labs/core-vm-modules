import type { DetailItem, DetailSection, NetworkToken, TxDetails } from '@avalabs/vm-module-types';
import {
  isAddPermissionlessDelegatorTx,
  isAddPermissionlessValidatorTx,
  isAddSubnetValidatorTx,
  isBlockchainDetails,
  isChainDetails,
  isExportTx,
  isImportTx,
  isRemoveSubnetValidatorTx,
  isSubnetDetails,
} from '../handlers/avalanche-send-transaction/typeguards';
import { addressItem, currencyItem, nodeIDItem, textItem, dateItem } from '@internal/utils';
import { TokenUnit } from '@avalabs/core-utils-sdk';
import { PVM } from '@avalabs/avalanchejs';
import { isPrimarySubnet } from '../handlers/avalanche-send-transaction/utils/is-primary-subnet';
import { AVAX_NONEVM_DENOMINATION } from '../constants';

export const getTransactionDetailSections = (txDetails: TxDetails, networkToken: NetworkToken) => {
  const details: DetailSection[] = [];

  if (isChainDetails(txDetails)) {
    const { chain, outputs, memo } = txDetails;

    details.push({
      title: 'Chain Details',
      items: [textItem('Active chain', `Avalanche ${AvalancheChainStrings[chain]}`)],
    });

    outputs.forEach((output, index) => {
      const balanceChangeItems: DetailItem[] = output.owners.flatMap((ownerAddress) => [
        addressItem('To', ownerAddress),
        textItem(
          'Amount',
          `${new TokenUnit(output.amount, networkToken.decimals, networkToken.symbol).toDisplay()} AVAX`,
        ),
      ]);

      if (output.owners.length > 1) {
        balanceChangeItems.push(textItem('Threshold', output.threshold.toString()));
      }

      details.push({
        title: index === 0 ? 'Balance Change' : undefined,
        items: balanceChangeItems,
      });
    });

    if (chain !== PVM && !!memo) {
      details.push({
        title: 'Memo',
        items: [memo],
      });
    }
  } else if (isExportTx(txDetails)) {
    const { amount, chain, destination, type } = txDetails;

    details.push({
      title: 'Transaction Details',
      items: [
        textItem('Source Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
        textItem('Target Chain', `Avalanche ${AvalancheChainStrings[destination]}`),
        textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
        currencyItem('Amount', amount, AVAX_NONEVM_DENOMINATION, networkToken.symbol),
      ],
    });
  } else if (isImportTx(txDetails)) {
    const { amount, chain, source, type } = txDetails;

    details.push({
      title: 'Transaction Details',
      items: [
        textItem('Source Chain', `Avalanche ${AvalancheChainStrings[source]}`),
        textItem('Destination Chain', `Avalanche ${AvalancheChainStrings[chain]}`),
        textItem('Transaction Type', type ? (type[0] || '').toUpperCase() + type.slice(1) : ''),
        currencyItem('Amount', amount, AVAX_NONEVM_DENOMINATION, networkToken.symbol),
      ],
    });
  } else if (isSubnetDetails(txDetails)) {
    const { threshold, controlKeys } = txDetails;

    details.push({
      title: 'Subnet Details',
      items: [
        textItem(controlKeys.length > 1 ? 'Owners' : 'Owner', controlKeys.join('\n'), 'vertical'),
        textItem('Signature Threshold', `${threshold}/${controlKeys.length}`, 'vertical'),
      ],
    });
  } else if (isAddPermissionlessDelegatorTx(txDetails)) {
    const { nodeID, start, end, stake, subnetID } = txDetails;

    const items: DetailItem[] = [
      nodeIDItem('Node ID', nodeID),
      isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
      currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, networkToken.symbol),
      dateItem('Start Date', start),
      dateItem('End Date', end),
    ];

    details.push({
      title: 'Staking Details',
      items,
    });
  } else if (isAddPermissionlessValidatorTx(txDetails)) {
    const { nodeID, delegationFee, start, end, stake, subnetID, signature, publicKey } = txDetails;

    const items: DetailItem[] = [
      nodeIDItem('Node ID', nodeID),
      isPrimarySubnet(subnetID) ? textItem('Subnet ID', 'Primary Network') : nodeIDItem('Subnet ID', subnetID),
    ];

    if (publicKey && signature) {
      items.push(nodeIDItem('Public Key', publicKey), nodeIDItem('Proof', signature));
    }

    items.push(
      currencyItem('Stake Amount', stake, AVAX_NONEVM_DENOMINATION, networkToken.symbol),
      textItem('Delegation Fee', `${delegationFee / 10000} %`),
      dateItem('Start Date', start),
      dateItem('End Date', end),
    );

    details.push({
      title: 'Staking Details',
      items,
    });
  } else if (isBlockchainDetails(txDetails)) {
    // handle genesis data similarly to how we handle data in transaction details
    const { chainID, chainName, vmID, genesisData } = txDetails;

    const items: DetailItem[] = [
      textItem('Blockchain name', chainName, 'vertical'),
      textItem('Blockchain ID', chainID, 'vertical'),
      textItem('Virtual Machine ID', vmID, 'vertical'),
      textItem('Genesis Data', genesisData, 'vertical'),
    ];

    details.push({
      title: 'Blockchain Details',
      items,
    });
  } else if (isAddSubnetValidatorTx(txDetails)) {
    const { nodeID, start, end, subnetID } = txDetails;

    const items: DetailItem[] = [
      nodeIDItem('Subnet ID', subnetID),
      nodeIDItem('Node ID', nodeID),
      dateItem('Start Date', start),
      dateItem('End Date', end),
    ];

    details.push({
      title: 'Staking Details',
      items,
    });
  } else if (isRemoveSubnetValidatorTx(txDetails)) {
    const { nodeID, subnetID } = txDetails;

    const items: DetailItem[] = [nodeIDItem('Node ID', nodeID), nodeIDItem('Subnet ID', subnetID)];

    details.push({
      title: 'Staking Details',
      items,
    });
  }

  const { txFee } = txDetails;
  if (txFee) {
    details.push({
      title: 'Network Fee',
      items: [currencyItem('Fee Amount', txFee, AVAX_NONEVM_DENOMINATION, networkToken.symbol)],
    });
  }

  return details;
};

enum AvalancheChainStrings {
  AVM = 'X Chain',
  PVM = 'P Chain',
  EVM = 'C Chain',
}
