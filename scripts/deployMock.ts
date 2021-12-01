/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */
import { constants } from "ethers";
import { ethers } from "hardhat";
import {
  BondDepository,
  BondDepository__factory,
  DAI,
  DAI__factory,
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
} from "../typechain";

const daiBondBCV = "369";
const minBondPrice = "50000";
const maxBondPayout = "50";
const bondFee = "10000";
const maxBondDebt = "1000000000000000";
const intialBondDebt = "0";
const initialRewardRate = "3000";
const initialIndex = "7675210820";
// Bond vesting length in blocks. 33110 ~ 5 days
const bondVestingLength = "33110";

const config: {
  dao: string;
  dai: string;
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
    dai?: string;
  };
} = {
  dao: "0xAA7628D94205C3EE90419Fc3A6b882f4D6A6F3F5",
  dai: "0x8Ae428C98E1F9d49E85d7676FA41906B209f2BB9",
  sato: "0x3020E6C9d294DbDd1E80ecAE0A70B7379AC83dD8",
  xsato: "0x9E8DdB7D293CEfadf283AB25CE6d0D2C47819387",
  wxsato: "0xba190A3Cc0d2F21F42466A0e21F94A6b5Cd51bbc",
  treasury: "0x6F3E07aDeae8CFC2Bfcdacd66a69E55D3f99c406",
  staking: "0xbB7589945DfD5Fc6D0408104b60Ed1b9a36c5129",
  stakingWarmup: "0x4Ab2F96c29819c4141a85195622424eefE06D2Dc",
  stakingHelper: "0x3eA8418C6202ed4b2cFaB5fA24394fc147C7B0C4",
  redeemHelper: "0x365166cc5797AaCc8583a524F7730Ae1182cA41e",
  distributor: "0xb9002059ce0f906fB51e2fD1202DCaEe72ffaD37",
  bond: {
    dai: "0xf408d31A31d36B831B3E1a05b961632dA098Ac4c",
  },
};

let sato: SATO;
let xsato: StakedSATO;
let wxsato: WrappedStakedSATO;
let dai: DAI;
let treasury: SatoshiTreasury;
let staking: SatoshiStaking;
let stakingWarmup: StakingWarmup;
let stakingHelper: StakingHelper;
let redeemHelper: RedeemHelper;
let distributor: Distributor;
let daiBond: BondDepository;

async function main() {
  const [deployer] = await ethers.getSigners();

  // about 1h in Rinkeby
  const epochLengthInBlocks = 240;
  const firstEpochBlock = 9736844;

  dai = DAI__factory.connect(config.dai, deployer);
  if ((await dai.balanceOf(deployer.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("mint 100000000 dai");
    const tx = await dai.mint(deployer.address, ethers.utils.parseEther("100000000"));
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

  if ((await sato.balanceOf(deployer.address)).lt(ethers.utils.parseUnits("10000", 9))) {
    console.log("mint 50000 sato");
    let tx = await sato.setVault(deployer.address);
    await tx.wait();
    tx = await sato.mint(deployer.address, ethers.utils.parseUnits("50000", 9));
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
    treasury = await Treasury.deploy(sato.address, dai.address, dai.address, 0);
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
    stakingWarmup = await StakingWarmpup.deploy(staking.address, sato.address);
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

  // Deploy DAI bond
  if (config.bond.dai === undefined) {
    const DAIBond = await ethers.getContractFactory("BondDepository", deployer);
    daiBond = await DAIBond.deploy(sato.address, dai.address, treasury.address, config.dao, constants.AddressZero);
    await daiBond.deployed();
    config.bond.dai = daiBond.address;
    console.log("Deploy DAIBond at:", daiBond.address);
  } else {
    daiBond = BondDepository__factory.connect(config.bond.dai, deployer);
    console.log("Found DAIBond at:", daiBond.address);
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
    console.log("add dai bond to redeem helper");
    const tx = await redeemHelper.addBondContract(daiBond.address);
    await tx.wait();
  }*/

  // queue and toggle DAI bond reserve depositor
  if (!(await treasury.isReserveDepositor(daiBond.address))) {
    console.log("queue and toggle DAI bond reserve depositor");
    let tx = await treasury.queue("0", daiBond.address);
    await tx.wait();
    tx = await treasury.toggle("0", daiBond.address, constants.AddressZero);
    await tx.wait();
  }

  // Set DAI and Frax bond terms
  if ((await daiBond.terms()).controlVariable.eq(constants.Zero)) {
    console.log("Set DAI bond terms");
    const tx = await daiBond.initializeBondTerms(
      daiBondBCV,
      bondVestingLength,
      minBondPrice,
      maxBondPayout,
      bondFee,
      maxBondDebt,
      intialBondDebt
    );
    await tx.wait();
  }

  // Set staking for DAI bond
  if ((await daiBond.staking()) === constants.AddressZero) {
    console.log("Set staking for DAI bond");
    const tx = await daiBond.setStaking(staking.address, false);
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

  // Approve the treasury to spend DAI
  if ((await dai.allowance(deployer.address, treasury.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve the treasury to spend DAI");
    const tx = await dai.approve(treasury.address, constants.MaxUint256);
    await tx.wait();
  }

  // Approve dai bonds to spend deployer's DAI
  if ((await dai.allowance(deployer.address, daiBond.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve dai bonds to spend deployer's DAI");
    const tx = await dai.approve(daiBond.address, constants.MaxUint256);
    await tx.wait();
  }

  if ((await dai.balanceOf(treasury.address)).lt(ethers.utils.parseEther("10000000"))) {
    console.log("deposit 10000000 dai to treasury");
    const tx = await treasury.deposit(
      ethers.utils.parseEther("10000000"),
      dai.address,
      ethers.utils.parseUnits("10000000", 9)
    );
    await tx.wait();
  }

  // Approve the staking/stakingHelper to spend sato
  if ((await sato.allowance(deployer.address, staking.address)).lt(ethers.utils.parseEther("100000000"))) {
    console.log("Approve the treasury to spend DAI");
    const tx = await sato.approve(staking.address, constants.MaxUint256);
    await tx.wait();
  }

  if ((await xsato.balanceOf(stakingWarmup.address)).eq(constants.Zero)) {
    console.log("stake through staking");
    const tx = await staking.stake(ethers.utils.parseUnits("10", 9), deployer.address);
    await tx.wait();
  }

  if ((await daiBond.bondInfo(deployer.address)).payout.eq(constants.Zero)) {
    console.log("bond 1000 dai");
    const tx = await daiBond.deposit(ethers.utils.parseEther("1000"), constants.MaxUint256, deployer.address);
    await tx.wait();
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
