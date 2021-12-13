/* eslint-disable node/no-missing-import */
import { expect } from "chai";
import { constants, Signer } from "ethers";
import { ethers } from "hardhat";
import {
  DAI,
  Distributor,
  SATO,
  SatoshiStaking,
  SatoshiTreasury,
  StakedSATO,
  StakingHelper,
  StakingWarmup,
} from "../typechain";

describe("SatoshiStaking.spec", async () => {
  let deployer: Signer;
  let alice: Signer;

  let dai: DAI;
  let sato: SATO;
  let xsato: StakedSATO;
  let treasury: SatoshiTreasury;
  let staking: SatoshiStaking;
  let stakingHelper: StakingHelper;
  let warmup: StakingWarmup;
  let distributor: Distributor;

  beforeEach(async () => {
    [deployer, alice] = await ethers.getSigners();

    const DAI = await ethers.getContractFactory("DAI", deployer);
    dai = await DAI.deploy();
    await dai.deployed();

    const SATO = await ethers.getContractFactory("SATO", deployer);
    sato = await SATO.deploy();
    await sato.deployed();

    await sato.setVault(await deployer.getAddress());
    await sato.mint(await deployer.getAddress(), ethers.utils.parseUnits("50000", 9));

    const StakedSATO = await ethers.getContractFactory("StakedSATO", deployer);
    xsato = await StakedSATO.deploy();

    const SatoshiTreasury = await ethers.getContractFactory("SatoshiTreasury", deployer);
    treasury = await SatoshiTreasury.deploy(sato.address, dai.address, dai.address, 0);

    const SatoshiStaking = await ethers.getContractFactory("SatoshiStaking", deployer);
    staking = await SatoshiStaking.deploy(sato.address, xsato.address, 200, 1, 100);

    const StakingHelper = await ethers.getContractFactory("StakingHelper", deployer);
    stakingHelper = await StakingHelper.deploy(staking.address, sato.address);

    const StakingWarmup = await ethers.getContractFactory("StakingWarmup", deployer);
    warmup = await StakingWarmup.deploy(staking.address, xsato.address);

    const Distributor = await ethers.getContractFactory("Distributor", deployer);
    distributor = await Distributor.deploy(treasury.address, sato.address, 200, 100);

    await distributor.addRecipient(staking.address, 10000); // 0.01
    await staking.setContract(0, distributor.address);
    await staking.setContract(1, warmup.address);
    await staking.setWarmup(0);
    await xsato.initialize(staking.address);
    await sato.setVault(treasury.address);
    await treasury.queue(8, distributor.address);
    await treasury.toggle(8, distributor.address, constants.AddressZero);
    await treasury.queue(0, await deployer.getAddress());
    await treasury.toggle(0, await deployer.getAddress(), constants.AddressZero);
    await xsato.setIndex(ethers.utils.parseUnits("1", 9));

    const amount = ethers.utils.parseEther("500000");
    const value = ethers.utils.parseUnits("500000", 9);
    await dai.mint(await deployer.getAddress(), amount);
    await dai.approve(treasury.address, amount);
    await treasury.deposit(amount, dai.address, value);
  });

  it("should succeed using staking helper", async () => {
    const amount = ethers.utils.parseUnits("10000", 9);
    await sato.transfer(await alice.getAddress(), amount);
    await sato.connect(alice).approve(stakingHelper.address, amount);
    await stakingHelper.connect(alice).stake(amount, await alice.getAddress());
    console.log((await xsato.balanceOf(await alice.getAddress())).toString());
    for (let i = 0; i < 200; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    await staking.rebase();
    console.log((await xsato.balanceOf(await alice.getAddress())).toString());
    for (let i = 0; i < 200; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    await staking.rebase();
    console.log((await xsato.balanceOf(await alice.getAddress())).toString());
    await staking.connect(alice).claim(await alice.getAddress());
    expect(await xsato.balanceOf(await alice.getAddress())).to.eq(
      amount.add(ethers.utils.parseUnits("50000", 9).mul(1).div(100))
    );
  });

  it("should succeed without rebase", async () => {
    const amount = ethers.utils.parseUnits("10000", 9);
    await sato.approve(staking.address, amount);
    await staking.stake(amount, await alice.getAddress());
    await staking.connect(alice).claim(await alice.getAddress());
    expect(await xsato.balanceOf(await alice.getAddress())).to.eq(amount);
  });

  it("should succeed with rebase", async () => {
    const amount = ethers.utils.parseUnits("10000", 9);
    await sato.approve(staking.address, amount);
    await staking.stake(amount, await alice.getAddress());
    console.log((await xsato.balanceOf(warmup.address)).toString());
    for (let i = 0; i < 200; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    await staking.rebase();
    console.log((await xsato.balanceOf(warmup.address)).toString());
    for (let i = 0; i < 200; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    await staking.rebase();
    console.log((await xsato.balanceOf(warmup.address)).toString());
    await staking.connect(alice).claim(await alice.getAddress());
    expect(await xsato.balanceOf(await alice.getAddress())).to.eq(
      amount.add(ethers.utils.parseUnits("50000", 9).mul(1).div(100))
    );
  });
});
