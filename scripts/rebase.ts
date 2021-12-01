/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */
import { ethers } from "hardhat";
import { SatoshiStaking__factory } from "../typechain";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const staking = SatoshiStaking__factory.connect("0xbB7589945DfD5Fc6D0408104b60Ed1b9a36c5129", deployer);
  while (true) {
    const block = await ethers.provider.getBlockNumber();
    try {
      if ((await staking.epoch()).endBlock.toNumber() <= block) {
        console.log("rebase at block:", block);
        const tx = await staking.rebase();
        await tx.wait();
      }
      await delay(15000);
    } catch (error) {
      console.log("go error:", error);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
