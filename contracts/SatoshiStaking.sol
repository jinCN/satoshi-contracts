// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./common/Ownable.sol";
import "./interfaces/IDistributor.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IStakedSATO.sol";
import "./interfaces/IStaking.sol";
import "./interfaces/IWarmup.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

contract SatoshiStaking is Ownable, IStaking {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  address public immutable SATO;
  address public immutable xSATO;

  struct Epoch {
    uint256 length;
    uint256 number;
    uint256 endBlock;
    uint256 distribute;
  }
  Epoch public epoch;

  address public distributor;

  address public locker;
  uint256 public totalBonus;

  address public warmupContract;
  uint256 public warmupPeriod;

  constructor(
    address _SATO,
    address _xSATO,
    uint256 _epochLength,
    uint256 _firstEpochNumber,
    uint256 _firstEpochBlock
  ) {
    require(_SATO != address(0));
    SATO = _SATO;
    require(_xSATO != address(0));
    xSATO = _xSATO;

    epoch = Epoch({ length: _epochLength, number: _firstEpochNumber, endBlock: _firstEpochBlock, distribute: 0 });
  }

  struct Claim {
    uint256 deposit;
    uint256 gons;
    uint256 expiry;
    bool lock; // prevents malicious delays
  }
  mapping(address => Claim) public warmupInfo;

  /**
        @notice stake SATO to enter warmup
        @param _amount uint
        @return bool
     */
  function stake(uint256 _amount, address _recipient) external override returns (bool) {
    rebase();

    IERC20(SATO).safeTransferFrom(msg.sender, address(this), _amount);

    Claim memory info = warmupInfo[_recipient];
    require(!info.lock, "Deposits for account are locked");

    warmupInfo[_recipient] = Claim({
      deposit: info.deposit.add(_amount),
      gons: info.gons.add(IStakedSATO(xSATO).gonsForBalance(_amount)),
      expiry: epoch.number.add(warmupPeriod),
      lock: false
    });

    IERC20(xSATO).safeTransfer(warmupContract, _amount);
    return true;
  }

  /**
        @notice retrieve xSATO from warmup
        @param _recipient address
     */
  function claim(address _recipient) public override {
    Claim memory info = warmupInfo[_recipient];
    if (epoch.number >= info.expiry && info.expiry != 0) {
      delete warmupInfo[_recipient];
      IWarmup(warmupContract).retrieve(_recipient, IStakedSATO(xSATO).balanceForGons(info.gons));
    }
  }

  /**
        @notice forfeit xSATO in warmup and retrieve SATO
     */
  function forfeit() external {
    Claim memory info = warmupInfo[msg.sender];
    delete warmupInfo[msg.sender];

    IWarmup(warmupContract).retrieve(address(this), IStakedSATO(xSATO).balanceForGons(info.gons));
    IERC20(SATO).safeTransfer(msg.sender, info.deposit);
  }

  /**
        @notice prevent new deposits to address (protection from malicious activity)
     */
  function toggleDepositLock() external {
    warmupInfo[msg.sender].lock = !warmupInfo[msg.sender].lock;
  }

  /**
        @notice redeem xSATO for SATO
        @param _amount uint
        @param _trigger bool
     */
  function unstake(uint256 _amount, bool _trigger) external {
    if (_trigger) {
      rebase();
    }
    IERC20(xSATO).safeTransferFrom(msg.sender, address(this), _amount);
    IERC20(SATO).safeTransfer(msg.sender, _amount);
  }

  /**
        @notice returns the xSATO index, which tracks rebase growth
        @return uint
     */
  function index() public view returns (uint256) {
    return IStakedSATO(xSATO).index();
  }

  /**
        @notice trigger rebase if epoch over
     */
  function rebase() public {
    if (epoch.endBlock <= block.number) {
      IStakedSATO(xSATO).rebase(epoch.distribute, epoch.number);

      epoch.endBlock = epoch.endBlock.add(epoch.length);
      epoch.number++;

      if (distributor != address(0)) {
        IDistributor(distributor).distribute();
      }

      uint256 balance = contractBalance();
      uint256 staked = IStakedSATO(xSATO).circulatingSupply();

      if (balance <= staked) {
        epoch.distribute = 0;
      } else {
        epoch.distribute = balance.sub(staked);
      }
    }
  }

  /**
        @notice returns contract SATO holdings, including bonuses provided
        @return uint
     */
  function contractBalance() public view returns (uint256) {
    return IERC20(SATO).balanceOf(address(this)).add(totalBonus);
  }

  /**
        @notice provide bonus to locked staking contract
        @param _amount uint
     */
  function giveLockBonus(uint256 _amount) external {
    require(msg.sender == locker);
    totalBonus = totalBonus.add(_amount);
    IERC20(xSATO).safeTransfer(locker, _amount);
  }

  /**
        @notice reclaim bonus from locked staking contract
        @param _amount uint
     */
  function returnLockBonus(uint256 _amount) external {
    require(msg.sender == locker);
    totalBonus = totalBonus.sub(_amount);
    IERC20(xSATO).safeTransferFrom(locker, address(this), _amount);
  }

  enum CONTRACTS {
    DISTRIBUTOR,
    WARMUP,
    LOCKER
  }

  /**
        @notice sets the contract address for LP staking
        @param _contract address
     */
  function setContract(CONTRACTS _contract, address _address) external onlyManager {
    if (_contract == CONTRACTS.DISTRIBUTOR) {
      // 0
      distributor = _address;
    } else if (_contract == CONTRACTS.WARMUP) {
      // 1
      require(warmupContract == address(0), "Warmup cannot be set more than once");
      warmupContract = _address;
    } else if (_contract == CONTRACTS.LOCKER) {
      // 2
      require(locker == address(0), "Locker cannot be set more than once");
      locker = _address;
    }
  }

  /**
   * @notice set warmup period for new stakers
   * @param _warmupPeriod uint
   */
  function setWarmup(uint256 _warmupPeriod) external onlyManager {
    warmupPeriod = _warmupPeriod;
  }
}
