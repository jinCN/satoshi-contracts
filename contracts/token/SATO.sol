// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "../common/EnumerableSet.sol";
import "../common/ERC20Permit.sol";
import "../common/Ownable.sol";
import "../interfaces/ITWAPOracle.sol";

contract VaultOwned is Ownable {
  address internal _vault;

  function setVault(address vault_) external onlyManager returns (bool) {
    _vault = vault_;

    return true;
  }

  /**
   * @dev Returns the address of the current vault.
   */
  function vault() public view returns (address) {
    return _vault;
  }

  /**
   * @dev Throws if called by any account other than the vault.
   */
  modifier onlyVault() {
    require(_vault == msg.sender, "VaultOwned: caller is not the Vault");
    _;
  }
}

contract TWAPOracleUpdater is ERC20Permit, VaultOwned {
  using EnumerableSet for EnumerableSet.AddressSet;

  event TWAPOracleChanged(address indexed previousTWAPOracle, address indexed newTWAPOracle);
  event TWAPEpochChanged(uint256 previousTWAPEpochPeriod, uint256 newTWAPEpochPeriod);
  event TWAPSourceAdded(address indexed newTWAPSource);
  event TWAPSourceRemoved(address indexed removedTWAPSource);

  EnumerableSet.AddressSet private _dexPoolsTWAPSources;

  ITWAPOracle public twapOracle;

  uint256 public twapEpochPeriod;

  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_
  ) ERC20(name_, symbol_, decimals_) {}

  function changeTWAPOracle(address newTWAPOracle_) external onlyManager {
    emit TWAPOracleChanged(address(twapOracle), newTWAPOracle_);
    twapOracle = ITWAPOracle(newTWAPOracle_);
  }

  function changeTWAPEpochPeriod(uint256 newTWAPEpochPeriod_) external onlyManager {
    require(newTWAPEpochPeriod_ > 0, "TWAPOracleUpdater: TWAP Epoch period must be greater than 0.");
    emit TWAPEpochChanged(twapEpochPeriod, newTWAPEpochPeriod_);
    twapEpochPeriod = newTWAPEpochPeriod_;
  }

  function addTWAPSource(address newTWAPSourceDexPool_) external onlyManager {
    require(_dexPoolsTWAPSources.add(newTWAPSourceDexPool_), "OlympusERC20TOken: TWAP Source already stored.");
    emit TWAPSourceAdded(newTWAPSourceDexPool_);
  }

  function removeTWAPSource(address twapSourceToRemove_) external onlyManager {
    require(_dexPoolsTWAPSources.remove(twapSourceToRemove_), "OlympusERC20TOken: TWAP source not present.");
    emit TWAPSourceRemoved(twapSourceToRemove_);
  }

  function _updateTWAPOracle(address dexPoolToUpdateFrom_, uint256 twapEpochPeriodToUpdate_) internal {
    if (_dexPoolsTWAPSources.contains(dexPoolToUpdateFrom_)) {
      twapOracle.updateTWAP(dexPoolToUpdateFrom_, twapEpochPeriodToUpdate_);
    }
  }

  function _beforeTokenTransfer(
    address from_,
    address to_,
    uint256
  ) internal virtual override {
    if (_dexPoolsTWAPSources.contains(from_)) {
      _updateTWAPOracle(from_, twapEpochPeriod);
    } else {
      if (_dexPoolsTWAPSources.contains(to_)) {
        _updateTWAPOracle(to_, twapEpochPeriod);
      }
    }
  }
}

contract Divine is TWAPOracleUpdater {
  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_
  ) TWAPOracleUpdater(name_, symbol_, decimals_) {}
}

contract SATO is Divine {
  using SafeMath for uint256;

  constructor() Divine("Satoshi", "SATO", 9) {}

  function mint(address account_, uint256 amount_) external onlyVault {
    _mint(account_, amount_);
  }

  /**
   * @dev Destroys `amount` tokens from the caller.
   *
   * See {ERC20-_burn}.
   */
  function burn(uint256 amount) public virtual {
    _burn(msg.sender, amount);
  }

  /*
   * @dev Destroys `amount` tokens from `account`, deducting from the caller's
   * allowance.
   *
   * See {ERC20-_burn} and {ERC20-allowance}.
   *
   * Requirements:
   *
   * - the caller must have allowance for ``accounts``'s tokens of at least
   * `amount`.
   */

  function burnFrom(address account_, uint256 amount_) public virtual {
    _burnFrom(account_, amount_);
  }

  function _burnFrom(address account_, uint256 amount_) public virtual {
    uint256 decreasedAllowance_ = allowance(account_, msg.sender).sub(amount_, "ERC20: burn amount exceeds allowance");

    _approve(account_, msg.sender, decreasedAllowance_);
    _burn(account_, amount_);
  }
}
