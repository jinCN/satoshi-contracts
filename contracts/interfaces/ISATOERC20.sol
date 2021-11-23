// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface ISATOERC20 {
  function burnFrom(address account_, uint256 amount_) external;
}
