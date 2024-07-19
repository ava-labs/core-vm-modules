import { parseRequestParams } from './parse-request-params';
import { RpcMethod } from '@avalabs/vm-module-types';
import { typedData as testTypedData } from './fixture';

const testAddress = '0x4e3F23eA4E5D483B5aD5dF0A6233dEEA093EFFD2';
const testData = '0x123';

describe('parseRequestParams', () => {
  describe('PERSONAL_SIGN', () => {
    it('parses with password correctly', () => {
      const params = {
        method: RpcMethod.PERSONAL_SIGN,
        params: [testData, testAddress, 'password'],
      };

      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({
        data: testData,
        address: testAddress,
        method: RpcMethod.PERSONAL_SIGN,
      });
    });

    it('parses without password correctly', () => {
      const params = {
        method: RpcMethod.PERSONAL_SIGN,
        params: [testData, testAddress],
      };

      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({
        data: testData,
        address: testAddress,
        method: RpcMethod.PERSONAL_SIGN,
      });
    });

    it('fails for invalid params', () => {
      const params = {
        method: RpcMethod.PERSONAL_SIGN,
        params: [],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });
  });

  describe('ETH_SIGN', () => {
    it('parses correctly', () => {
      const params = {
        method: RpcMethod.ETH_SIGN,
        params: [testAddress, testData],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({
        data: testData,
        address: testAddress,
        method: RpcMethod.ETH_SIGN,
      });
    });

    it('fails for invalid params', () => {
      const params = {
        method: RpcMethod.ETH_SIGN,
        params: [],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });
  });

  describe('SIGN_TYPED_DATA', () => {
    it('parses with valid JSON string correctly', () => {
      const testObject = [{ type: 'string', name: 'message', value: 'Hello' }];
      const validJson = JSON.stringify(testObject);
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA,
        params: [testAddress, validJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA);
      expect(result.data?.data).toEqual(testObject);
    });

    it('parses with valid object correctly', () => {
      const validObject = [{ type: 'string', name: 'message', value: 'Hello' }];

      const params = {
        method: RpcMethod.SIGN_TYPED_DATA,
        params: [testAddress, validObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA);
      expect(result.data?.data).toEqual(validObject);
    });

    it('fails with invalid JSON string', () => {
      const invalidJson = "{ 'message': 'Hello' }";
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA,
        params: [testAddress, invalidJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });

    it('fails with invalid object', () => {
      const invalidObject = [{ type: 'string', name: 'message' }]; // missing value
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA,
        params: [testAddress, invalidObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });
  });

  describe('SIGN_TYPED_DATA_V1', () => {
    it('parses with valid JSON string correctly', () => {
      const testObject = [{ type: 'string', name: 'message', value: 'Hello' }];
      const validJson = JSON.stringify(testObject);
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V1,
        params: [testAddress, validJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA_V1);
      expect(result.data?.data).toEqual(testObject);
    });

    it('parses with valid object correctly', () => {
      const validObject = [{ type: 'string', name: 'message', value: 'Hello' }];

      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V1,
        params: [testAddress, validObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA_V1);
      expect(result.data?.data).toEqual(validObject);
    });

    it('fails with invalid JSON string', () => {
      const invalidJson = "{ 'message': 'Hello' }";
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V1,
        params: [testAddress, invalidJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });

    it('fails with invalid object', () => {
      const invalidObject = [{ type: 'string', name: 'message' }]; // missing value
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V1,
        params: [testAddress, invalidObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });
  });

  describe('SIGN_TYPED_DATA_V3', () => {
    it('parses with valid JSON string correctly', () => {
      const testObject = testTypedData;
      const validJson = JSON.stringify(testObject);
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V3,
        params: [testAddress, validJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA_V3);
      expect(result.data?.data).toEqual(testObject);
    });

    it('parses with valid object correctly', () => {
      const validObject = testTypedData;

      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V3,
        params: [testAddress, validObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA_V3);
      expect(result.data?.data).toEqual(validObject);
    });

    it('fails with invalid JSON string', () => {
      const invalidJson = "{ 'message': 'Hello' }";
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V3,
        params: [testAddress, invalidJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });

    it('fails with invalid object', () => {
      const invalidObject = [{ type: 'string', name: 'message' }];
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V3,
        params: [testAddress, invalidObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });
  });

  describe('SIGN_TYPED_DATA_V4', () => {
    it('parses with valid JSON string correctly', () => {
      const testObject = testTypedData;
      const validJson = JSON.stringify(testObject);
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V4,
        params: [testAddress, validJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA_V4);
      expect(result.data?.data).toEqual(testObject);
    });

    it('parses with valid object correctly', () => {
      const validObject = testTypedData;

      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V4,
        params: [testAddress, validObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeTruthy();
      expect(result.data?.address).toEqual(testAddress);
      expect(result.data?.method).toEqual(RpcMethod.SIGN_TYPED_DATA_V4);
      expect(result.data?.data).toEqual(validObject);
    });

    it('fails with invalid JSON string', () => {
      const invalidJson = "{ 'message': 'Hello' }";
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V4,
        params: [testAddress, invalidJson],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });

    it('fails with invalid object', () => {
      const invalidObject = [{ type: 'string', name: 'message' }];
      const params = {
        method: RpcMethod.SIGN_TYPED_DATA_V4,
        params: [testAddress, invalidObject],
      };
      const result = parseRequestParams(params);
      expect(result.success).toBeFalsy();
    });
  });

  it('fails for unsupported method', () => {
    const params = {
      method: 'UNSUPPORTED_METHOD',
      params: [testAddress, testData],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = parseRequestParams(params as any);
    expect(result.success).toBeFalsy();
  });
});
