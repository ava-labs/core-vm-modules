import { TxType, type DetailSection, type TxDetails } from '@avalabs/vm-module-types';
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

type TxHandlerMapping = {
  [key in TxType]?: {
    typeGuard: (tx: TxDetails) => boolean; // The type guard function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (tx: any, symbol: string) => DetailSection[];
  };
};

const txHandlerMapping: TxHandlerMapping = {
  [TxType.Base]: {
    typeGuard: isChainDetails,
    handler: chainDetailSection,
  },
  [TxType.AddPermissionlessDelegator]: {
    typeGuard: isAddPermissionlessDelegatorTx,
    handler: addPermissionlessDelegatorDetailSection,
  },
  [TxType.AddPermissionlessValidator]: {
    typeGuard: isAddPermissionlessValidatorTx,
    handler: addPermissionlessValidatorDetailSection,
  },
  [TxType.Export]: {
    typeGuard: isExportTx,
    handler: exportDetailSection,
  },
  [TxType.Import]: {
    typeGuard: isImportTx,
    handler: importDetailSection,
  },
  [TxType.AddSubnetValidator]: {
    typeGuard: isAddSubnetValidatorTx,
    handler: addSubnetValidatorDetailSection,
  },
  [TxType.RemoveSubnetValidator]: {
    typeGuard: isRemoveSubnetValidatorTx,
    handler: removeSubnetValidatorDetailSection,
  },
  [TxType.ConvertSubnetToL1]: {
    typeGuard: isConvertSubnetToL1Tx,
    handler: convertSubnetToL1DetailSection,
  },
  [TxType.DisableL1Validator]: {
    typeGuard: isDisableL1ValidatorTx,
    handler: disableL1ValidatorDetailSection,
  },
  [TxType.IncreaseL1ValidatorBalance]: {
    typeGuard: isIncreaseL1ValidatorBalanceTx,
    handler: increaseL1ValidatorBalanceDetailSection,
  },
  [TxType.RegisterL1Validator]: {
    typeGuard: isRegisterL1ValidatorTx,
    handler: registerL1ValidatorDetailSection,
  },
  [TxType.SetL1ValidatorWeight]: {
    typeGuard: isSetL1ValidatorWeightTx,
    handler: setL1ValidatorWeightDetailSection,
  },
  [TxType.CreateChain]: {
    typeGuard: isBlockchainDetails,
    handler: blockChainDetailSection,
  },
  [TxType.CreateSubnet]: {
    typeGuard: isSubnetDetails,
    handler: subnetDetailSection,
  },
};

export const getTransactionDetailSections = (txDetails: TxDetails, symbol: string) => {
  const mapping = txHandlerMapping[txDetails.type];
  if (mapping && mapping.typeGuard(txDetails)) {
    return mapping.handler(txDetails, symbol);
  }
  throw new Error(`Unsupported or invalid transaction type: ${txDetails.type}`);
};
