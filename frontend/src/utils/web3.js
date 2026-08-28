import { ethers } from "ethers";

import {
  REAL_ESTATE_ASSET_ADDRESS,
  REAL_ESTATE_ASSET_ABI,
  NFT_CONTRACT_ADDRESS,
} from "../config";

// Hardhat local network
export const HARDHAT_CHAIN_ID = 31337n;

// Resolve contract address while keeping legacy compatibility
export const ASSET_ADDRESS =
  REAL_ESTATE_ASSET_ADDRESS || NFT_CONTRACT_ADDRESS;

/**
 * Detects the browser EIP-1193 provider.
 * Prefers MetaMask when multiple wallet providers exist.
 */
export const getEthereumProvider = () => {
  if (
    typeof window === "undefined" ||
    typeof window.ethereum === "undefined"
  ) {
    return null;
  }

  if (window.ethereum.providers?.length) {
    return (
      window.ethereum.providers.find(
        (provider) => provider.isMetaMask
      ) || window.ethereum
    );
  }

  return window.ethereum;
};

/**
 * Connects the user's MetaMask wallet.
 *
 * @returns {Promise<string>}
 * Connected wallet address.
 */
export const connectWallet = async () => {
  const ethereum = getEthereumProvider();

  if (!ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install the MetaMask browser extension."
    );
  }

  const accounts = await ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error(
      "No wallet account was returned by MetaMask."
    );
  }

  return ethers.getAddress(accounts[0]);
};

/**
 * Verifies that the wallet is connected to the
 * expected local Hardhat network.
 */
export const checkNetwork = async (browserProvider) => {
  const network = await browserProvider.getNetwork();

  if (network.chainId !== HARDHAT_CHAIN_ID) {
    throw new Error(
      `Wrong network detected. Please connect MetaMask to Hardhat Localhost (Chain ID 31337). Current Chain ID: ${network.chainId.toString()}`
    );
  }

  return network;
};

/**
 * Initializes Ethers BrowserProvider, Signer and
 * RealEstateAsset contract instance.
 *
 * @returns {Promise<{
 *   provider: ethers.BrowserProvider,
 *   signer: ethers.Signer,
 *   account: string,
 *   assetContract: ethers.Contract
 * }>}
 */
export const initWeb3Contracts = async () => {
  const ethereum = getEthereumProvider();

  if (!ethereum) {
    throw new Error(
      "Ethereum provider not detected. Please install or enable MetaMask."
    );
  }

  if (!ASSET_ADDRESS) {
    throw new Error(
      "RealEstateAsset contract address is not configured."
    );
  }

  if (!ethers.isAddress(ASSET_ADDRESS)) {
    throw new Error(
      "Configured RealEstateAsset contract address is invalid."
    );
  }

  if (
    !Array.isArray(REAL_ESTATE_ASSET_ABI) ||
    REAL_ESTATE_ASSET_ABI.length === 0
  ) {
    throw new Error(
      "RealEstateAsset ABI is missing or invalid."
    );
  }

  const browserProvider =
    new ethers.BrowserProvider(ethereum);

  await checkNetwork(browserProvider);

  const signer =
    await browserProvider.getSigner();

  const account =
    await signer.getAddress();

  const assetContract =
    new ethers.Contract(
      ASSET_ADDRESS,
      REAL_ESTATE_ASSET_ABI,
      signer
    );

  return {
    provider: browserProvider,
    signer,
    account,
    assetContract,
  };
};

/**
 * Formats Wei/BigInt values into an ETH string.
 *
 * @param {bigint|string|number} weiValue
 * @param {number} decimals
 * @returns {string}
 */
export const formatEth = (
  weiValue,
  decimals = 4
) => {
  if (
    weiValue === null ||
    weiValue === undefined ||
    weiValue === ""
  ) {
    return "0.00";
  }

  try {
    const formatted =
      ethers.formatEther(
        weiValue.toString()
      );

    const numericValue =
      Number(formatted);

    if (!Number.isFinite(numericValue)) {
      return "0.00";
    }

    return numericValue.toFixed(decimals);
  } catch {
    return "0.00";
  }
};

/**
 * Converts an ETH amount into Wei.
 *
 * @param {string|number} ethAmount
 * @returns {bigint}
 */
export const parseEth = (ethAmount) => {
  if (
    ethAmount === null ||
    ethAmount === undefined ||
    ethAmount === ""
  ) {
    return 0n;
  }

  const value =
    ethAmount.toString().trim();

  if (value === "") {
    return 0n;
  }

  if (
    !/^\d+(\.\d+)?$/.test(value)
  ) {
    throw new Error(
      "Invalid ETH amount."
    );
  }

  return ethers.parseEther(value);
};

/**
 * Shortens an Ethereum address for display.
 *
 * Example:
 * 0x123456...7890
 *
 * @param {string} address
 * @returns {string}
 */
export const truncateAddress = (address) => {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};