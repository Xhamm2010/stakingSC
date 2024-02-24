import { ethers } from "hardhat";

async function main() {

    const [owner] = await ethers.getSigners();

    const stakingAddress = "0x41847Cc9a1939Ec74927dCc4B09a4439c4533084";
    const tokenAddress = "0x35d91a96B5467Aac905Cd4fD96c8B6a319070122";

    const staking = await ethers.getContractAt("Staking", stakingAddress);
    const token = await ethers.getContractAt("Token", tokenAddress);

    const allowTx = await token.approve(stakingAddress, ethers.parseEther("1"));
    allowTx.wait();
    const tx = await staking.stake(ethers.parseEther("1"));
    tx.wait();

    const stakedAmount = await staking.stakedAmount(owner.address);
    console.log("Staked amount: ", stakedAmount.toString());


    // const balance = await token.balanceOf("0xb2b2130b4B83Af141cFc4C5E3dEB1897eB336D79");
    // console.log("Balance: ", balance.toString());

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
