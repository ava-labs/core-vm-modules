enum ChainId {
  ETHEREUM_HOMESTEAD = 1,
  ETHEREUM_TEST_RINKEBY = 4,
  ETHEREUM_TEST_GOERLY = 5,
  ETHEREUM_TEST_SEPOLIA = 11155111,
}

export const isEthereumChainId = (chainId: number): boolean => {
  return (
    ChainId.ETHEREUM_HOMESTEAD === chainId ||
    ChainId.ETHEREUM_TEST_GOERLY === chainId ||
    ChainId.ETHEREUM_TEST_RINKEBY === chainId ||
    ChainId.ETHEREUM_TEST_SEPOLIA === chainId
  );
};
