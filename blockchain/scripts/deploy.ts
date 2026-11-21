import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log("Deploying MockStockToken (mNVDA)...");
  console.log(`Deployer address: ${deployer ? deployer.address : "N/A"}`);

  const MockStockToken = await ethers.getContractFactory("MockStockToken");
  const token = await MockStockToken.deploy();

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("==================================================");
  console.log(`MockStockToken deployed successfully!`);
  console.log(`Contract Address : ${tokenAddress}`);
  console.log(`Token Name       : Mock NVDA`);
  console.log(`Token Symbol     : mNVDA`);
  console.log(`Initial Supply   : 1,000,000 mNVDA (to deployer)`);
  console.log(`Explorer Link    : https://sepolia.basescan.org/address/${tokenAddress}`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
