import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Staking", function () {
    async function deployStakingFixture() {
        const [owner, accountOne, accountTwo] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("Token");
        const token = await Token.deploy(ethers.parseEther("1000000"));
    
        const Staking = await ethers.getContractFactory("Staking");
        const staking = await Staking.deploy(token.getAddress());

        await token.transfer(staking.getAddress(), ethers.parseEther("1000"));
        await token.transfer(accountOne.address, ethers.parseEther("1000"));
        await token.transfer(accountTwo.address, ethers.parseEther("5000"));

        return { staking, token, owner, accountOne, accountTwo };
    }

    describe("Deployment", function () {
        it("Test Should deploy fixture with the contract address owning 1000 * 10^18 token for staking rewards", async function () { 
            const { staking, token } = await loadFixture(deployStakingFixture);
            await expect(await token.balanceOf(staking.getAddress())).to.be.equal(ethers.parseEther("1000"));
        });
    });
    describe("Staking", function() {
        it("Should be able to stake tokens", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));
            await expect(await staking.stakedAmount(accountOne.getAddress())).to.be.equal(ethers.parseEther("100"));
        });
        it("Should update the contract balance by user stake", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));

            await expect((await token.balanceOf(staking.getAddress())).toString()).to.be.equal(ethers.parseEther("1100"));
        });
        it("Should not be able to stake 0 tokens", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await expect(staking.connect(accountOne).stake(ethers.parseEther("0"))).to.be.revertedWithCustomError(staking, "ZERO_STAKE_ERROR");
        });
        it("Should create a time entry when user calls stake", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));

            await expect(await staking.stakingTime(accountOne.getAddress())).to.be.equal(await time.latest());
        });
    });
    describe("Unstaking", function() {
        it("Should revert when user tries to unstake 0 tokens", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));
            await expect(staking.connect(accountOne).unstake(ethers.parseEther("0"))).to.be.revertedWithCustomError(staking, "ZERO_UNSTAKE_ERROR");
        });
        it("Should revert when user tries to unstake more than staked amount", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));
            await expect(staking.connect(accountOne).unstake(ethers.parseEther("200"))).to.be.revertedWithCustomError(staking, "UNSTAKE_AMOUNT_EXCEEDS_STAKED_AMOUNT_ERROR");
        });
        it("Should revert when user tries to unstake before the staking period", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));
            await time.increase(20);
            await expect(staking.connect(accountOne).unstake(ethers.parseEther("100"))).to.be.revertedWithCustomError(staking, "UNSTAKE_TIME_NOT_ELAPSED_ERROR");
        });
        it("Should payout the right amount user requested to unstake", async function () {
            const { staking, token, accountOne, accountTwo } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));
            await token.connect(accountTwo).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountTwo).stake(ethers.parseEther("50"));
            await time.increase(time.duration.minutes(2));
            await staking.connect(accountOne).unstake(ethers.parseEther("110")); // 10% interest added after min unlock time
            await expect((await token.balanceOf(accountOne.address)).toString()).to.be.equal(ethers.parseEther("1010"));
            await staking.connect(accountTwo).unstake(ethers.parseEther("60")); // 20% interest added after 2 * min unlock time
            await expect((await token.balanceOf(accountTwo.address)).toString()).to.be.equal(ethers.parseEther("5010"));
        });
        it("Should update the user staked balance after unstaking", async function () {
            const { staking, token, accountOne } = await loadFixture(deployStakingFixture);
            await token.connect(accountOne).approve(staking.getAddress(), ethers.parseEther("100"));
            await staking.connect(accountOne).stake(ethers.parseEther("100"));
            await time.increase(time.duration.minutes(2));
            await staking.connect(accountOne).unstake(ethers.parseEther("50"));
            await expect(await staking.stakedAmount(accountOne.getAddress())).to.be.greaterThanOrEqual(ethers.parseEther("60")); // remaining balance + 10% interest
        });
    });
});