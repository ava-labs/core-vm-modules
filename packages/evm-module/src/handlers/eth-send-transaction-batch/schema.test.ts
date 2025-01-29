import { parseRequestParams } from './schema';
import { z } from 'zod';

it('should return success for valid params', () => {
  const paramsList = [
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '13',
        chainId: '1',
      },
    ],
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        data: '0xdifferent-data',
      },
    ],
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '13',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0x1',
        gas: '0x5208',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        value: '0x2',
        gas: '0x5208',
        chainId: '1',
      },
    ],
  ];

  for (const params of paramsList) {
    const result = parseRequestParams(params);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(params);
  }
});

it('should return error for invalid params', () => {
  const paramsList = [
    // only one transaction
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '13',
        chainId: '1',
      },
    ],
    // missing "from"
    [
      {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // invalid "from"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x123',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // different "from"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x0987654321098765432109876543210987654321',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0xvalue',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // same nonces
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        gas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdiffent-data',
        gas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // non-hex "gas"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0x5208',
        gas: 'gas',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdiffent-data',
        gas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // different chain ids
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0x5208',
        gas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        gas: '0x5208',
        nonce: '13',
        chainId: '43114',
      },
    ],
  ];

  for (const params of paramsList) {
    const result = parseRequestParams([params]);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(z.ZodError);
  }
});
