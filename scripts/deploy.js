import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const TruthRecord = await ethers.getContractFactory("TruthRecord");
  const contract = await TruthRecord.deploy();
  await contract.deployed();

  console.log("TruthRecord deployed to:", contract.address);

  const out = {
    address: contract.address
  };
  fs.writeFileSync("deployedAddress.json", JSON.stringify(out, null, 2));
  console.log("Saved deployedAddress.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
