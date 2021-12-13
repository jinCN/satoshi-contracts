// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./interfaces/IERC20.sol";
import "./interfaces/IStaking.sol";

contract StakingHelper {
  address public immutable staking;
  address public immutable SATO;

  constructor(address _staking, address _SATO) {
    require(_staking != address(0));
    staking = _staking;
    require(_SATO != address(0));
    SATO = _SATO;
  }

  function stake(uint256 _amount, address _recipient) external {
    IERC20(SATO).transferFrom(msg.sender, address(this), _amount);
    IERC20(SATO).approve(staking, _amount);
    IStaking(staking).stake(_amount, _recipient);
    IStaking(staking).claim(_recipient);
  }
}
