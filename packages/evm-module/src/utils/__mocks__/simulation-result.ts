export default {
  validation: {
    status: 'Success',
    result_type: 'Benign',
    description: '',
    reason: '',
    classification: '',
    features: [],
  },
  simulation: {
    status: 'Success',
    assets_diffs: {},
    params: {
      from: '0xOwnerAddress',
      to: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      value: '0x0',
      data: '0x39509351000000000000000000000000a078e31894a51b2f8c6adcb70be73b1e62c247050000000000000000000000000000000000000000000000000000650e124ef1c7',
      block_tag: 'latest',
      chain: 'avalanche',
      calldata: {
        function_selector: '0x39509351',
        function_signature: 'increaseAllowance(address,uint256)',
      },
    },
    total_usd_diff: {},
    exposures: {
      '0xOwnerAddress': [
        {
          asset_type: 'ERC20',
          asset: {
            type: 'ERC20',
            address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            logo_url: 'https://cdn.blockaid.io/token/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E/avalanche',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          spenders: {
            '0xSpenderAddress': {
              summary: 'Approved 111111111.111 USDC to 0xSpenderAddress',
              exposure: [
                {
                  usd_price: '0.025722871384999998',
                  value: '0.025722999999999999',
                  raw_value: '0x647b',
                },
              ],
              approval: '0x650e124ef1c7',
            },
          },
        },
      ],
    },
    total_usd_exposure: {
      '0xOwnerAddress': {
        '0xSpenderAddress': '0.025722871384999998',
      },
    },
    address_details: {
      '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E': {
        name_tag: 'Circle: USDC Token',
        contract_name: 'FiatTokenProxy',
      },
    },
    account_summary: {
      assets_diffs: [],
      traces: [
        {
          type: 'ERC20ExposureTrace',
          exposed: {
            raw_value: '0x650e124ef1c7',
            value: 111111111.111111,
            usd_price: 111110555.55555545,
          },
          trace_type: 'ExposureTrace',
          owner: '0xOwnerAddress',
          spender: '0xSpenderAddress',
          asset: {
            type: 'ERC20',
            address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            logo_url: 'https://cdn.blockaid.io/token/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E/avalanche',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
        },
      ],
      exposures: [
        {
          asset_type: 'ERC20',
          asset: {
            type: 'ERC20',
            address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            logo_url: 'https://cdn.blockaid.io/token/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E/avalanche',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          spenders: {
            '0xSpenderAddress': {
              summary: 'Approved 111111111.111 USDC to 0xSpenderAddress',
              exposure: [
                {
                  usd_price: '0.025722871384999998',
                  value: '0.025722999999999999',
                  raw_value: '0x647b',
                },
              ],
              approval: '0x650e124ef1c7',
            },
          },
        },
      ],
      total_usd_exposure: {
        '0xSpenderAddress': '0.025722871384999998',
      },
    },
  },
  block: '56977604',
  chain: 'avalanche',
  account_address: '0xOwnerAddress',
};
