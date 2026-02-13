import { type Network, type TxDetails } from '@avalabs/vm-module-types';
import {
  isAddPermissionlessDelegatorTx,
  isAddPermissionlessValidatorTx,
  isAddSubnetValidatorTx,
  isBlockchainDetails,
  isExportTx,
  isImportTx,
  isRemoveSubnetValidatorTx,
  isSubnetDetails,
  isConvertSubnetToL1Tx,
  isDisableL1ValidatorTx,
  isIncreaseL1ValidatorBalanceTx,
  isRegisterL1ValidatorTx,
  isSetL1ValidatorWeightTx,
  isChainDetails,
} from '../handlers/avalanche-send-transaction/typeguards';
import {
  convertSubnetToL1DetailSection,
  addSubnetValidatorDetailSection,
  removeSubnetValidatorDetailSection,
  addPermissionlessValidatorDetailSection,
  blockChainDetailSection,
  subnetDetailSection,
  chainDetailSection,
  exportDetailSection,
  importDetailSection,
  addPermissionlessDelegatorDetailSection,
  disableL1ValidatorDetailSection,
  increaseL1ValidatorBalanceDetailSection,
  registerL1ValidatorDetailSection,
  setL1ValidatorWeightDetailSection,
} from './transaction-detail-sections';

export type GetTransactionDetailSectionsContext = {
  network: Network;
  signerAccount: string;
};

export const getTransactionDetailSections = (
  txDetails: TxDetails,
  symbol: string,
  context?: GetTransactionDetailSectionsContext,
) => {
  if (isChainDetails(txDetails)) {
    return chainDetailSection(txDetails, symbol);
  } else if (isExportTx(txDetails)) {
    return exportDetailSection(txDetails, symbol);
  } else if (isImportTx(txDetails)) {
    return importDetailSection(txDetails, symbol);
  } else if (isSubnetDetails(txDetails)) {
    return subnetDetailSection(txDetails, symbol);
  } else if (isAddPermissionlessDelegatorTx(txDetails)) {
    if (!context) throw new Error('context (network, signerAccount) is required for AddPermissionlessDelegator');
    return addPermissionlessDelegatorDetailSection({
      tx: txDetails,
      symbol,
      network: context.network,
      signerAccount: context.signerAccount,
    });
  } else if (isAddPermissionlessValidatorTx(txDetails)) {
    if (!context) throw new Error('context (network, signerAccount) is required for AddPermissionlessValidator');
    return addPermissionlessValidatorDetailSection({
      tx: txDetails,
      symbol,
      network: context.network,
      signerAccount: context.signerAccount,
    });
  } else if (isBlockchainDetails(txDetails)) {
    return blockChainDetailSection(txDetails, symbol);
  } else if (isAddSubnetValidatorTx(txDetails)) {
    return addSubnetValidatorDetailSection(txDetails, symbol);
  } else if (isRemoveSubnetValidatorTx(txDetails)) {
    return removeSubnetValidatorDetailSection(txDetails, symbol);
  } else if (isConvertSubnetToL1Tx(txDetails)) {
    return convertSubnetToL1DetailSection(txDetails, symbol);
  } else if (isDisableL1ValidatorTx(txDetails)) {
    return disableL1ValidatorDetailSection(txDetails, symbol);
  } else if (isIncreaseL1ValidatorBalanceTx(txDetails)) {
    return increaseL1ValidatorBalanceDetailSection(txDetails, symbol);
  } else if (isRegisterL1ValidatorTx(txDetails)) {
    return registerL1ValidatorDetailSection(txDetails, symbol);
  } else if (isSetL1ValidatorWeightTx(txDetails)) {
    return setL1ValidatorWeightDetailSection(txDetails, symbol);
  }
};
