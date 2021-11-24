import { constants } from "ethers";
import { ethers } from "hardhat";

const daiBondBCV = "369";
const minBondPrice = "50000";
const maxBondPayout = "50";
const bondFee = "10000";
const maxBondDebt = "1000000000000000";
const intialBondDebt = "0";
const initialRewardRate = "3000";
const initialMint = "10000000000000000000000000";
const firstEpochNumber = "338";
const epochLengthInBlocks = "2200";
const firstEpochBlock = "9699531";
const initialIndex = "7675210820";
// Bond vesting length in blocks. 33110 ~ 5 days
const bondVestingLength = "33110";

const MockDAO = "0xAA7628D94205C3EE90419Fc3A6b882f4D6A6F3F5";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy SATO
  const SATO = await ethers.getContractFactory("SATO", deployer);
  // const sata = await SATO.deploy();
  const sato = await ethers.getContractAt("SATO", "0x6981A2DaF2cc23BDCF08E83aB4E3c6Bc7be34Eed", deployer);
  console.log("SATO: ", sato.address);

  // Deploy DAI
  const DAI = await ethers.getContractFactory("DAI", deployer);
  // const dai = await DAI.deploy();
  const dai = await ethers.getContractAt("DAI", "0x8Ae428C98E1F9d49E85d7676FA41906B209f2BB9", deployer);
  console.log("DAI: ", dai.address);

  // await dai.mint(deployer.address, initialMint);

  // Deploy treasury
  const Treasury = await ethers.getContractFactory("OlympusTreasury", deployer);
  // const treasury = await Treasury.deploy(sato.address, dai.address, dai.address, 0);
  const treasury = await ethers.getContractAt(
    "OlympusTreasury",
    "0x1610C2Be53062E9239eff8aF443b5423c2090bfe",
    deployer
  );
  console.log("Treasury: ", treasury.address);

  // Deploy bonding calc
  const BondCalculator = await ethers.getContractFactory("BondCalculator", deployer);
  // const bondCalculator = await BondCalculator.deploy(sato.address);
  const bondCalculator = await ethers.getContractAt(
    "BondCalculator",
    "0xb36E0E525abff7fDBcbcd1c1a1991a87C698410c",
    deployer
  );
  console.log("BondCalculator: ", bondCalculator.address);

  // Deploy staking distributor
  const Distributor = await ethers.getContractFactory("Distributor", deployer);
  // const distributor = await Distributor.deploy(treasury.address, sato.address, epochLengthInBlocks, firstEpochBlock);
  const distributor = await ethers.getContractAt("Distributor", "0x9DF9BdD4d8a5f7b9b69c032898e3e045b559a457", deployer);
  console.log("Distributor: ", distributor.address);

  // Deploy StakedSATO
  const StakedSATO = await ethers.getContractFactory("StakedSATO", deployer);
  // const xSATO = await StakedSATO.deploy();
  const xSATO = await ethers.getContractAt("StakedSATO", "0x54c639443eCbc668E5573b3e4Df4B07e34cFC710", deployer);
  console.log("StakedSATO: ", xSATO.address);

  // Deploy Staking
  const SatoshiStaking = await ethers.getContractFactory("SatoshiStaking", deployer);
  /*const staking = await SatoshiStaking.deploy(
    sato.address,
    xSATO.address,
    epochLengthInBlocks,
    firstEpochNumber,
    firstEpochBlock
  );*/
  const staking = await ethers.getContractAt("SatoshiStaking", "0x2f193FAE2D49f62F02Df6b7E8C5B635bb9C70C3B", deployer);
  console.log("SatoshiStaking: ", staking.address);

  // Deploy staking warmpup
  const StakingWarmpup = await ethers.getContractFactory("StakingWarmup", deployer);
  // const stakingWarmup = await StakingWarmpup.deploy(staking.address, sato.address);
  const stakingWarmup = await ethers.getContractAt(
    "StakingWarmup",
    "0x08d1F5e93bBEaD2d47E7BE417BA6748D3Aaf62E1",
    deployer
  );
  console.log("StakingWarmpup: ", stakingWarmup.address);

  // Deploy staking helper
  const StakingHelper = await ethers.getContractFactory("StakingHelper", deployer);
  // const stakingHelper = await StakingHelper.deploy(staking.address, sato.address);
  const stakingHelper = await ethers.getContractAt(
    "StakingHelper",
    "0xF4013be990f750f730dbF3221597c8e37B300162",
    deployer
  );
  console.log("StakingHelper: ", stakingHelper.address);

  // Deploy DAI bond
  const DAIBond = await ethers.getContractFactory("BondDepository", deployer);
  // const daiBond = await DAIBond.deploy(sato.address, dai.address, treasury.address, MockDAO, constants.AddressZero);
  const daiBond = await ethers.getContractAt("BondDepository", "0xC150d822DEAD8016BEf5853F3D2a00F18f69265a", deployer);
  console.log("DAIBond: ", daiBond.address);

  // queue and toggle DAI bond reserve depositor
  console.log("queue and toggle DAI bond reserve depositor");
  // await treasury.queue("0", daiBond.address);
  // await treasury.toggle("0", daiBond.address, constants.AddressZero);

  // Set DAI and Frax bond terms
  console.log("Set DAI bond terms");
  /*await daiBond.initializeBondTerms(
    daiBondBCV,
    bondVestingLength,
    minBondPrice,
    maxBondPayout,
    bondFee,
    maxBondDebt,
    intialBondDebt
  );*/

  // Set staking for DAI bond
  console.log("Set staking for DAI bond");
  // await daiBond.setStaking(stakingHelper.address, true);

  // Initialize xSATO and set the index
  console.log("Initialize xSATO and set the index");
  // await xSATO.initialize(staking.address);
  // await xSATO.setIndex(initialIndex);

  // set distributor contract and warmup contract
  console.log("set distributor contract and warmup contract");
  // await staking.setContract("0", distributor.address);
  // await staking.setContract("1", stakingWarmup.address);

  // Set treasury for SATO token
  console.log("Set treasury for SATO token");
  // await sato.setVault(treasury.address);

  // Add staking contract as distributor recipient
  console.log("Add staking contract as distributor recipient");
  // await distributor.addRecipient(staking.address, initialRewardRate);

  // queue and toggle reward manager
  console.log("queue and toggle reward manager");
  // await treasury.queue("8", distributor.address);
  // await treasury.toggle("8", distributor.address, constants.AddressZero);

  // queue and toggle deployer reserve depositor
  console.log("queue and toggle deployer reserve depositor");
  // await treasury.queue("0", deployer.address);
  // await treasury.toggle("0", deployer.address, constants.AddressZero);

  // queue and toggle liquidity depositor
  console.log("queue and toggle liquidity depositor");
  // await treasury.queue("4", deployer.address);
  await treasury.toggle("4", deployer.address, constants.AddressZero);

  // Approve the treasury to spend DAI
  console.log("Approve the treasury to spend DAI");
  await dai.approve(treasury.address, constants.MaxUint256);

  // Approve dai bonds to spend deployer's DAI
  console.log("Approve dai bonds to spend deployer's DAI");
  await dai.approve(daiBond.address, constants.MaxUint256);

  // Approve staking and staking helper contact to spend deployer's SATO
  console.log("Approve staking and staking helper contact to spend deployer's SATO");
  await sato.approve(staking.address, constants.MaxUint256);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
