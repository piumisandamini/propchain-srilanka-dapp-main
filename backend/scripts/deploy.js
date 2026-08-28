import pkg from "hardhat";

const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();

  const deployerBalance =
    await ethers.provider.getBalance(deployer.address);

  console.log("----------------------------------------------------");
  console.log("Deploying RealEstateAsset contract");
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", deployerBalance.toString());
  console.log("----------------------------------------------------");

  const RealEstateAsset =
    await ethers.getContractFactory("RealEstateAsset");

  const realEstate =
    await RealEstateAsset.deploy(deployer.address);

  await realEstate.waitForDeployment();

  const contractAddress =
    await realEstate.getAddress();

  console.log("RealEstateAsset deployed successfully");
  console.log("Contract address:", contractAddress);
  console.log("----------------------------------------------------");
  console.log("Frontend configuration");
  console.log("Update frontend/src/config.js with:");
  console.log(
    `export const REAL_ESTATE_ASSET_ADDRESS = "${contractAddress}";`
  );
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:");
  console.error(error);

  process.exitCode = 1;
});