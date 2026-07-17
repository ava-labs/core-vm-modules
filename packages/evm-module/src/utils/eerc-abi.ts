// Human-readable ABI fragments for the eERC (Encrypted ERC) operations Core recognizes.
//
// Kept local (not pulled from a package): the eERC contracts repo is not published to
// npm, and the eERC SDK (@avalabs/eerc-sdk) does not export its ABIs and drags in
// snarkjs/react/wagmi, which I deemed too heavy to pull into this repo.
//
// Signatures are transcribed from the canonical sources (pinned commits):
//   EncryptedERC.abi.ts: https://github.com/ava-labs/eerc-sdk/blob/b7cb0a59735e1d28c1aa21dfd18bdc61738c0ca5/src/utils/EncryptedERC.abi.ts
//   Registrar.abi.ts:    https://github.com/ava-labs/eerc-sdk/blob/b7cb0a59735e1d28c1aa21dfd18bdc61738c0ca5/src/utils/Registrar.abi.ts
//   Contracts:           https://github.com/ava-labs/EncryptedERC/blob/c7eb0e09bc9315e68c35d3c09f5dce4b794d0485/contracts/EncryptedERC.sol

export const EERC_ABI = [
  // Registrar
  'function register(((uint256[2],uint256[2][2],uint256[2]),uint256[5]) proof)',
  // EncryptedERC
  'function setAuditorPublicKey(address user)',
  'function privateMint(address user, ((uint256[2],uint256[2][2],uint256[2]),uint256[24]) proof)',
  'function privateMint(address user, ((uint256[2],uint256[2][2],uint256[2]),uint256[24]) proof, bytes message)',
  'function deposit(uint256 amount, address tokenAddress, uint256[7] amountPCT)',
  'function deposit(uint256 amount, address tokenAddress, uint256[7] amountPCT, bytes message)',
  'function transfer(address to, uint256 tokenId, ((uint256[2],uint256[2][2],uint256[2]),uint256[32]) proof, uint256[7] balancePCT)',
  'function transfer(address to, uint256 tokenId, ((uint256[2],uint256[2][2],uint256[2]),uint256[32]) proof, uint256[7] balancePCT, bytes message)',
  'function withdraw(uint256 tokenId, ((uint256[2],uint256[2][2],uint256[2]),uint256[16]) proof, uint256[7] balancePCT)',
  'function withdraw(uint256 tokenId, ((uint256[2],uint256[2][2],uint256[2]),uint256[16]) proof, uint256[7] balancePCT, bytes message)',
] as const;
