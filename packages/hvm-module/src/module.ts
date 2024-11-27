/* eslint-disable */
import {
  type Module,
  type Manifest,
  parseManifest,
  type ConstructorParams,
  type ApprovalController,
  type GetAddressParams,
  type RpcRequest,
} from '@avalabs/vm-module-types';

import ManifestJson from '../manifest.json';

export class HvmModule implements Module {
  #approvalController: ApprovalController;

  constructor({ approvalController }: ConstructorParams) {
    this.#approvalController = approvalController;
    console.log('this.#approvalController: ', this.#approvalController);
  }

  getManifest(): Manifest | undefined {
    const result = parseManifest(ManifestJson);
    console.log('getManifest result: ', result);
    return result.success ? result.data : undefined;
  }

  //@ts-ignore
  getAddress(params: GetAddressParams) {
    console.log('params: ', params);
    console.log('getAddress called');
  }

  //@ts-ignore
  getBalances() {
    console.log('getBalances called');
  }

  //@ts-ignore
  async onRpcRequest(request: RpcRequest) {
    console.log('onRpcRequest called: ', request);
  }
}
