// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./interfaces/IERC20.sol";

contract StakingWarmup {
  address public immutable staking;
  address public immutable xSATO;

  constructor(address _staking, address _xSATO) {
    require(_staking != address(0));
    staking = _staking;
    require(_xSATO != address(0));
    xSATO = _xSATO;
  }

  function retrieve(address _staker, uint256 _amount) external {
    require(msg.sender == staking);
    IERC20(xSATO).transfer(_staker, _amount);
  }
}
