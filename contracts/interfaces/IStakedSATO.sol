// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface IStakedSATO {
  function rebase(uint256 satoProfit_, uint256 epoch_) external returns (uint256);

  function circulatingSupply() external view returns (uint256);

  function balanceOf(address who) external view returns (uint256);

  function gonsForBalance(uint256 amount) external view returns (uint256);

  function balanceForGons(uint256 gons) external view returns (uint256);

  function index() external view returns (uint256);
}
