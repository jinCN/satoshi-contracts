// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface IWarmup {
  function retrieve(address staker_, uint256 amount_) external;
}
