/* eslint-disable node/no-missing-import */
import { expect } from "chai";
import { constants, Signer } from "ethers";
import { ethers } from "hardhat";
import {
  BondDepository,
  Distributor,
  SATO,
  SatoshiStaking,
  SatoshiTreasury,
  StakedSATO,
  StakingHelper,
  StakingWarmup,
  WBTC,
} from "../typechain";

describe("WBTCBond.spec", async () => {
  let deployer: Signer;
  let alice: Signer;
  let dao: Signer;

  let wbtc: WBTC;
  let sato: SATO;
  let xsato: StakedSATO;
  let treasury: SatoshiTreasury;
  let staking: SatoshiStaking;
  let stakingHelper: StakingHelper;
  let warmup: StakingWarmup;
  let distributor: Distributor;
  let bond: BondDepository;

  beforeEach(async () => {
    [deployer, alice, dao] = await ethers.getSigners();

    const WBTC = await ethers.getContractFactory("WBTC", deployer);
    wbtc = await WBTC.deploy();
    await wbtc.deployed();
    await wbtc.mint(await deployer.getAddress(), ethers.utils.parseUnits("100000", 8));

    const SATO = await ethers.getContractFactory("SATO", deployer);
    sato = await SATO.deploy();
    await sato.deployed();

    await sato.setVault(await deployer.getAddress());
    await sato.mint(await deployer.getAddress(), ethers.utils.parseUnits("50000", 18));

    const StakedSATO = await ethers.getContractFactory("StakedSATO", deployer);
    xsato = await StakedSATO.deploy();

    const SatoshiTreasury = await ethers.getContractFactory("SatoshiTreasury", deployer);
    treasury = await SatoshiTreasury.deploy(sato.address, wbtc.address, wbtc.address, 0);

    const SatoshiStaking = await ethers.getContractFactory("SatoshiStaking", deployer);
    staking = await SatoshiStaking.deploy(sato.address, xsato.address, 200, 1, 100);

    const StakingHelper = await ethers.getContractFactory("StakingHelper", deployer);
    stakingHelper = await StakingHelper.deploy(staking.address, sato.address);

    const StakingWarmup = await ethers.getContractFactory("StakingWarmup", deployer);
    warmup = await StakingWarmup.deploy(staking.address, xsato.address);

    const Distributor = await ethers.getContractFactory("Distributor", deployer);
    distributor = await Distributor.deploy(treasury.address, sato.address, 200, 100);

    const WBTCBond = await ethers.getContractFactory("BondDepository", deployer);
    bond = await WBTCBond.deploy(
      sato.address,
      wbtc.address,
      treasury.address,
      await dao.getAddress(),
      constants.AddressZero
    );

    const wbtcBondBCV = ethers.utils.parseUnits("742", 10);
    const minBondPrice = ethers.utils.parseUnits("0.0008", 10);
    const maxBondPayout = "50";
    const bondFee = "10000";
    const maxBondDebt = ethers.utils.parseEther("1").mul(10000000); // 1000 btc
    const intialBondDebt = "0";
    const bondVestingLength = "33110";

    await bond.initializeBondTerms(
      wbtcBondBCV,
      bondVestingLength,
      minBondPrice,
      maxBondPayout,
      bondFee,
      maxBondDebt,
      intialBondDebt
    );

    await treasury.queue("0", bond.address);
    await treasury.toggle("0", bond.address, constants.AddressZero);

    await bond.setStaking(stakingHelper.address, true);

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
    await xsato.setIndex(ethers.utils.parseUnits("1", 18));

    const amount = ethers.utils.parseUnits("500000", 8);
    const value = ethers.utils.parseUnits("500000", 18 + 4);
    await wbtc.mint(await deployer.getAddress(), amount);
    await wbtc.approve(treasury.address, amount);
    await treasury.deposit(amount, wbtc.address, value);
  });

  it("should succeed while bond", async () => {
    console.log((await bond.bondPrice()).toString());
    await wbtc.approve(bond.address, constants.MaxUint256);
    await bond.deposit(ethers.utils.parseUnits("1", 8), constants.MaxUint256, await deployer.getAddress());
  });
});
