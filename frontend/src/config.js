import RealEstateAssetABI from "./abis/RealEstateAsset.json";

// PropChain RealEstateAsset smart contract address
export const REAL_ESTATE_ASSET_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Supports either a Hardhat artifact object or a raw ABI array
export const REAL_ESTATE_ASSET_ABI =
  RealEstateAssetABI.abi || RealEstateAssetABI;

// Legacy aliases retained for compatibility with existing components
export const NFT_CONTRACT_ADDRESS =
  REAL_ESTATE_ASSET_ADDRESS;

export const NFT_ABI =
  REAL_ESTATE_ASSET_ABI;