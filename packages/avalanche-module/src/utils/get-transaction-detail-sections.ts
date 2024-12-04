import type { TxDetails } from '@avalabs/vm-module-types';
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
  isConvertSubnetToL1Tx,
  isDisableL1ValidatorTx,
  isIncreaseL1ValidatorBalanceTx,
  isRegisterL1ValidatorTx,
  isSetL1ValidatorWeightTx,
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

export const getTransactionDetailSections = (txDetails: TxDetails, symbol: string) => {
  if (isChainDetails(txDetails)) {
    return chainDetailSection(txDetails, symbol);
  } else if (isExportTx(txDetails)) {
    return exportDetailSection(txDetails, symbol);
  } else if (isImportTx(txDetails)) {
    return importDetailSection(txDetails, symbol);
  } else if (isSubnetDetails(txDetails)) {
    return subnetDetailSection(txDetails, symbol);
  } else if (isAddPermissionlessDelegatorTx(txDetails)) {
    return addPermissionlessDelegatorDetailSection(txDetails, symbol);
  } else if (isAddPermissionlessValidatorTx(txDetails)) {
    return addPermissionlessValidatorDetailSection(txDetails, symbol);
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
