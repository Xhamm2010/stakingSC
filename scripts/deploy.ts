import { ethers } from "hardhat";

async function main() {

  const token = await ethers.deployContract("Token", [ethers.parseEther("1000000")]);
  await token.waitForDeployment();

  const staking = await ethers.deployContract("Staking", [token.target]);

  await staking.waitForDeployment();

  console.log(
    `Token deployed to\t ${token.target}\nStaking deployed to\t ${staking.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
