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
    ],
    [
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
        gas: '0x5208',
        gasPrice: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
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
    ],
    // invalid "from"
    [
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
    // missing "to"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
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
    // invalid "to"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x123',
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
    // non-hex "value"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: 'value',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
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
    ],
    // non-hex "gasPrice"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0x5208',
        gas: '0x5208',
        gasPrice: 'gasPrice',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // non-hex "maxFeePerGas"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0x5208',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: 'maxFeePerGas',
        maxPriorityFeePerGas: '0x5208',
        nonce: '12',
        chainId: '1',
      },
    ],
    // non-hex "maxPriorityFeePerGas"
    [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x1234567890123456789012345678901234567890',
        data: '0xdata',
        value: '0x5208',
        gas: '0x5208',
        gasPrice: '0x5208',
        maxFeePerGas: '0x5208',
        maxPriorityFeePerGas: 'maxPriorityFeePerGas',
        nonce: '12',
        chainId: '1',
      },
    ],
    // multiple transactions
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
        nonce: '12',
        chainId: '1',
      },
    ],
  ];

  for (const params of paramsList) {
    const result = parseRequestParams([params]);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(z.ZodError);
  }
});
