/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */
import { constants } from "ethers";
import { ethers } from "hardhat";
import {
  BondDepository,
  BondDepository__factory,
  Distributor,
  Distributor__factory,
  RedeemHelper,
  RedeemHelper__factory,
  SATO,
  SatoshiStaking,
  SatoshiStaking__factory,
  SatoshiTreasury,
  SatoshiTreasury__factory,
  SATO__factory,
  StakedSATO,
  StakedSATO__factory,
  StakingHelper,
  StakingHelper__factory,
  StakingWarmup,
  StakingWarmup__factory,
  WrappedStakedSATO,
  WrappedStakedSATO__factory,
  WBTC,
  WBTC__factory,
} from "../typechain";

const wbtcBondBCV = ethers.utils.parseUnits("742", 10);
const minBondPrice = ethers.utils.parseUnits("0.0008", 10);
const maxBondPayout = "50";
const bondFee = "10000";
const maxBondDebt = ethers.utils.parseEther("1").mul(10000000); // 1000 btc
const intialBondDebt = "0";
const initialRewardRate = "3000";
const initialIndex = ethers.utils.parseEther("1");
// Bond vesting length in blocks. 33110 ~ 5 days
const bondVestingLength = "33110";

const config: {
  dao: string;
  wbtc?: string;
  sato?: string;
  xsato?: string;
  wxsato?: string;
  treasury?: string;
  staking?: string;
  stakingWarmup?: string;
  stakingHelper?: string;
  redeemHelper?: string;
  distributor?: string;
  bond: {
    wbtc?: string;
  };
} = {
  dao: "0xAA7628D94205C3EE90419Fc3A6b882f4D6A6F3F5",
  wbtc: "0x5180E4D72A3BB3d2b60c77Ac6fdc0bFfEffCb5CC",
  sato: "0x9942E04E033bD59A70D4Be61D7Fcb9C5527DAFC8",
  xsato: "0x5B884F9661151373E555c6BF38Bf1bef8cec5C36",
  wxsato: "0xC198eCd605dE9A56D006788dFEfAB24842fC14CC",
  treasury: "0x300C42F5297A769E0802c14395b45423169546d7",
  staking: "0xebcf429520593CD3Db94381C4d4E561A5b007eB2",
  stakingWarmup: "0x63D85976a7c2174a902F7a877c0826b5f6b96B93",
  stakingHelper: "0x6C723B543f34912280b5E2531F32032c5Cc0C5eB",
  distributor: "0xF99052FcE1cfB5D636D500f7c021743b3f80E103",
  redeemHelper: "0x9EdADb2FAa8c29137b1D85d061CeBA19fc0a0019",
  bond: {
    wbtc: "0x64ed510cf8006738bd5d7C0073404E1966944F4B",
  },
};

let sato: SATO;
let xsato: StakedSATO;
let wxsato: WrappedStakedSATO;
let wbtc: WBTC;
let treasury: SatoshiTreasury;
let staking: SatoshiStaking;
let stakingWarmup: StakingWarmup;
let stakingHelper: StakingHelper;
let redeemHelper: RedeemHelper;
let distributor: Distributor;
let wbtcBond: BondDepository;

async function main() {
  const [deployer] = await ethers.getSigners();

  // about 1h in Rinkeby
  const epochLengthInBlocks = 240;
  const firstEpochBlock = 9806292;

  if (config.wbtc === undefined) {
    const WBTC = await ethers.getContractFactory("WBTC", deployer);
    wbtc = await WBTC.deploy();
    await wbtc.deployed();
    config.wbtc = wbtc.address;
    console.log("Deploy WBTC at:", wbtc.address);
  } else {
    wbtc = WBTC__factory.connect(config.wbtc, deployer);
    console.log("Found WBTC at:", wbtc.address);
  }
  if ((await wbtc.balanceOf(deployer.address)).lt(ethers.utils.parseUnits("100000000", 8))) {
    console.log("mint 100000000 wbtc");
    const tx = await wbtc.mint(deployer.address, ethers.utils.parseUnits("100000000", 8));
    await tx.wait();
  }

  // Deploy SATO
  if (config.sato === undefined) {
    const SATO = await ethers.getContractFactory("SATO", deployer);
    sato = await SATO.deploy();
    await sato.deployed();
    config.sato = sato.address;
    console.log("Deploy SATO at:", sato.address);
  } else {
    sato = SATO__factory.connect(config.sato, deployer);
    console.log("Found SATO at:", sato.address);
  }

  if ((await sato.balanceOf(deployer.address)).lt(ethers.utils.parseUnits("10000", 18))) {
    console.log("mint 50000 sato");
    let tx = await sato.setVault(deployer.address);
    await tx.wait();
    tx = await sato.mint(deployer.address, ethers.utils.parseUnits("50000", 18));
    await tx.wait();
  }

  // Deploy StakedSATO
  if (config.xsato === undefined) {
    const StakedSATO = await ethers.getContractFactory("StakedSATO", deployer);
    xsato = await StakedSATO.deploy();
    await xsato.deployed();
    config.xsato = xsato.address;
    console.log("Deploy StakedSATO at:", xsato.address);
  } else {
    xsato = StakedSATO__factory.connect(config.xsato, deployer);
    console.log("Found StakedSATO at:", xsato.address);
  }

  // Deploy WrappedStakedSATO
  if (config.wxsato === undefined) {
    const WrappedStakedSATO = await ethers.getContractFactory("WrappedStakedSATO", deployer);
    wxsato = await WrappedStakedSATO.deploy(xsato.address);
    await wxsato.deployed();
    config.wxsato = wxsato.address;
    console.log("Deploy WrappedStakedSATO at:", wxsato.address);
  } else {
    wxsato = WrappedStakedSATO__factory.connect(config.wxsato, deployer);
    console.log("Found WrappedStakedSATO at:", wxsato.address);
  }

  // Deploy treasury
  if (config.treasury === undefined) {
    const Treasury = await ethers.getContractFactory("SatoshiTreasury", deployer);
    treasury = await Treasury.deploy(sato.address, wbtc.address, wbtc.address, 0);
    await treasury.deployed();
    config.treasury = treasury.address;
    console.log("Deploy Treasury at:", treasury.address);
  } else {
    treasury = SatoshiTreasury__factory.connect(config.treasury, deployer);
    console.log("Found Treasury at:", treasury.address);
  }

  // Deploy Staking
  if (config.staking === undefined) {
    const SatoshiStaking = await ethers.getContractFactory("SatoshiStaking", deployer);
    staking = await SatoshiStaking.deploy(sato.address, xsato.address, epochLengthInBlocks, 1, firstEpochBlock);
    await staking.deployed();
    console.log("Deploy SatoshiStaking at:", staking.address);
  } else {
    staking = SatoshiStaking__factory.connect(config.staking, deployer);
    console.log("Found SatoshiStaking at:", staking.address);
  }

  // Deploy staking warmpup
  if (config.stakingWarmup === undefined) {
    const StakingWarmpup = await ethers.getContractFactory("StakingWarmup", deployer);
    stakingWarmup = await StakingWarmpup.deploy(staking.address, xsato.address);
    await stakingWarmup.deployed();
    config.stakingWarmup = stakingWarmup.address;
    console.log("Deploy StakingWarmpup at:", stakingWarmup.address);
  } else {
    stakingWarmup = StakingWarmup__factory.connect(config.stakingWarmup, deployer);
    console.log("Found StakingWarmpup at:", stakingWarmup.address);
  }

  // Deploy staking helper
  if (config.stakingHelper === undefined) {
    const StakingHelper = await ethers.getContractFactory("StakingHelper", deployer);
    stakingHelper = await StakingHelper.deploy(staking.address, sato.address);
    await stakingHelper.deployed();
    config.stakingHelper = stakingHelper.address;
    console.log("Deploy StakingHelper at:", stakingHelper.address);
  } else {
    stakingHelper = StakingHelper__factory.connect(config.stakingHelper, deployer);
    console.log("Found StakingHelper at:", stakingHelper.address);
  }

  // Deploy staking distributor
  if (config.distributor === undefined) {
    const Distributor = await ethers.getContractFactory("Distributor", deployer);
    distributor = await Distributor.deploy(treasury.address, sato.address, epochLengthInBlocks, firstEpochBlock);
    await distributor.deployed();
    config.distributor = distributor.address;
    console.log("Deploy Distributor at:", distributor.address);
  } else {
    distributor = Distributor__factory.connect(config.distributor, deployer);
    console.log("Found Distributor at:", distributor.address);
  }

  // Deploy WBTC bond
  if (config.bond.wbtc === undefined) {
    const WBTCBond = await ethers.getContractFactory("BondDepository", deployer);
    wbtcBond = await WBTCBond.deploy(sato.address, wbtc.address, treasury.address, config.dao, constants.AddressZero);
    await wbtcBond.deployed();
    config.bond.wbtc = wbtcBond.address;
    console.log("Deploy WBTCBond at:", wbtcBond.address);
  } else {
    wbtcBond = BondDepository__factory.connect(config.bond.wbtc, deployer);
    console.log("Found WBTCBond at:", wbtcBond.address);
  }

  // Deploy RedeemHelper
  if (config.redeemHelper === undefined) {
    const RedeemHelper = await ethers.getContractFactory("RedeemHelper", deployer);
    redeemHelper = await RedeemHelper.deploy();
    await redeemHelper.deployed();
    console.log("Deploy RedeemHelper at:", redeemHelper.address);
  } else {
    redeemHelper = RedeemHelper__factory.connect(config.redeemHelper, deployer);
    console.log("Found RedeemHelper at:", redeemHelper.address);
  }

  /*{
    console.log("add wbtc bond to redeem helper");
    const tx = await redeemHelper.addBondContract(wbtcBond.address);
    await tx.wait();
  }*/

  // queue and toggle WBTC bond reserve depositor
  if (!(await treasury.isReserveDepositor(wbtcBond.address))) {
    console.log("queue and toggle WBTC bond reserve depositor");
    let tx = await treasury.queue("0", wbtcBond.address);
    await tx.wait();
    tx = await treasury.toggle("0", wbtcBond.address, constants.AddressZero);
    await tx.wait();
  }

  // Set WBTC and Frax bond terms
  if ((await wbtcBond.terms()).controlVariable.eq(constants.Zero)) {
    console.log("Set WBTC bond terms");
    const tx = await wbtcBond.initializeBondTerms(
      wbtcBondBCV,
      bondVestingLength,
      minBondPrice,
      maxBondPayout,
      bondFee,
      maxBondDebt,
      intialBondDebt
    );
    await tx.wait();
  }

  // Set staking for WBTC bond
  if ((await wbtcBond.stakingHelper()) === constants.AddressZero) {
    console.log("Set staking for WBTC bond");
    const tx = await wbtcBond.setStaking(stakingHelper.address, true);
    await tx.wait();
  }

  // Initialize xSATO and set the index
  if ((await xsato.stakingContract()) === constants.AddressZero) {
    console.log("Initialize xSATO and set the index");
    let tx = await xsato.initialize(staking.address);
    await tx.wait();
    tx = await xsato.setIndex(initialIndex);
    await tx.wait();
  }

  // set distributor contract and warmup contract
  if ((await staking.distributor()) !== distributor.address) {
    console.log("set distributor contract");
    const tx = await staking.setContract(0, distributor.address);
    await tx.wait();
  }
  if ((await staking.warmupContract()) === constants.AddressZero) {
    console.log("set stakingWarmup contract");
    const tx = await staking.setContract(1, stakingWarmup.address);
    await tx.wait();
  }

  // Set treasury for SATO token
  if ((await sato.vault()) !== treasury.address) {
    console.log("Set treasury for SATO token");
    const tx = await sato.setVault(treasury.address);
    await tx.wait();
  }

  // Add staking contract as distributor recipient
  /*{
    console.log("Add staking contract as distributor recipient");
    const tx = await distributor.addRecipient(staking.address, initialRewardRate);
    await tx.wait();
  }*/

  // queue and toggle reward manager
  if (!(await treasury.isRewardManager(distributor.address))) {
    console.log("queue and toggle reward manager");
    let tx = await treasury.queue("8", distributor.address);
    await tx.wait();
    tx = await treasury.toggle("8", distributor.address, constants.AddressZero);
    await tx.wait();
  }

  // queue and toggle deployer reserve depositor
  if (!(await treasury.isReserveDepositor(deployer.address))) {
    console.log("queue and toggle deployer reserve depositor");
    let tx = await treasury.queue("0", deployer.address);
    await tx.wait();
    tx = await treasury.toggle("0", deployer.address, constants.AddressZero);
    await tx.wait();
  }

  // Approve the treasury to spend WBTC
  if ((await wbtc.allowance(deployer.address, treasury.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve the treasury to spend WBTC");
    const tx = await wbtc.approve(treasury.address, constants.MaxUint256);
    await tx.wait();
  }

  // Approve wbtc bonds to spend deployer's WBTC
  if ((await wbtc.allowance(deployer.address, wbtcBond.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve wbtc bonds to spend deployer's WBTC");
    const tx = await wbtc.approve(wbtcBond.address, constants.MaxUint256);
    await tx.wait();
  }

  if ((await wbtc.balanceOf(treasury.address)).lt(ethers.utils.parseUnits("100", 8))) {
    console.log("deposit 100 wbtc to treasury");
    const tx = await treasury.deposit(
      ethers.utils.parseUnits("100", 8),
      wbtc.address,
      ethers.utils.parseUnits("100", 18 + 4)
    );
    await tx.wait();
  }

  // Approve the staking/stakingHelper to spend sato
  if ((await sato.allowance(deployer.address, staking.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve the staking to spend sato");
    const tx = await sato.approve(staking.address, constants.MaxUint256);
    await tx.wait();
  }
  if ((await sato.allowance(deployer.address, stakingHelper.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve the stakingHelper to spend sato");
    const tx = await sato.approve(stakingHelper.address, constants.MaxUint256);
    await tx.wait();
  }

  if ((await xsato.balanceOf(deployer.address)).eq(constants.Zero)) {
    console.log("stake through staking helper");
    const tx = await stakingHelper.stake(ethers.utils.parseUnits("10", 18), await deployer.address);
    await tx.wait();
  }

  if ((await wbtcBond.bondInfo(deployer.address)).payout.eq(constants.Zero)) {
    console.log("bond 1 wbtc");
    const tx = await wbtcBond.deposit(ethers.utils.parseUnits("1", 8), constants.MaxUint256, deployer.address);
    await tx.wait();
  }

  /*{
    const tx = await wbtcBond.setAdjustment(false, 1, 233, 1);
    await tx.wait();
  }*/
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
