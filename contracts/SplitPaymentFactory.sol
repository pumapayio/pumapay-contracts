pragma solidity 0.5.16;

import "./SplitPayment.sol";
import "./Factory.sol";

/// @title PumaPay Slit Payment Factory
/// @notice A smart contract that deploys Split payment smart contracts
/// It stores in mappings:
/// 1. The instantiations of the split payment smart contracts per receiver and creator
/// 2. The instantiation count for each receiver and creator
/// 3. A boolean indicating that an address is an instantiation
/// @author Giorgos Kourtellos - <giorgos@pumapay.io>
contract SplitPaymentFactory is Factory {

    // ===============================================================================================================
    /// Events
    // ===============================================================================================================
    event LogSplitPaymentInstantiation(address indexed actor, SplitPayment indexed instantiation);

    // ===============================================================================================================
    // Storage
    // ===============================================================================================================
    mapping(address => SplitPayment[]) public instantiations;
    mapping(address => uint256) public instantiationsCount;

    // ===============================================================================================================
    /// Modifiers
    // ===============================================================================================================
    modifier validAddressArray(address[] memory _addresses) {
        for (uint i = 0; i < _addresses.length; i++) {
            require(_addresses[i] != address(0), "SplitPaymentFactory::validAddressArray - ZERO_ADDRESS");
        }
        _;
    }

    // ===============================================================================================================
    /// Public functions
    // ===============================================================================================================

    /// @dev Creates a new split payment smart contract.
    /// @param _token - Token Address.
    /// @param _receivers - Array of receiver addresses
    /// @param _percentages - Array of percentages
    function create(address _token, address[] memory _receivers, uint256[] memory _percentages)
    public
    validAddressArray(_receivers)
    {
        require(_token != address(0), "SplitPaymentFactory::constructor - ZERO_ADDRESS");
        require(_receivers.length > 0, "SplitPaymentFactory::constructor - NO_ADDRESSES");
        require(_percentages.length > 0, "SplitPaymentFactory::constructor - NO_PERCENTAGES");
        require(_receivers.length == _percentages.length, "SplitPaymentFactory::constructor - ADDRESSES_PERCENTAGES_MISMATCH");
        require(checkPercentagesValidity(_percentages), "SplitPaymentFactory::constructor - PERCENTAGES_SUM_MISMATCH");

        SplitPayment splitPayment = new SplitPayment(_token, _receivers, _percentages);
        register(splitPayment, _receivers);
    }

    // ===============================================================================================================
    /// Internal functions
    // ===============================================================================================================
    /// @dev Registers contract in factory registry.
    /// It sets the instantiation address for creator and at the same time increments the count for it.
    /// It does exactly the same for the receiver addresses.
    /// Finally it emits events for both actors -> creator and receivers with the address of the split payment contract
    /// @param splitPayment Address of contract instantiation.
    function register(SplitPayment splitPayment, address[] memory _receivers)
    internal
    {
        instantiations[msg.sender].push(splitPayment);
        instantiationsCount[msg.sender] = instantiationsCount[msg.sender] + 1;
        isInstantiation[address(splitPayment)] = true;

        for (uint i = 0; i < uint(_receivers.length); i++) {
            instantiations[_receivers[i]].push(splitPayment);
            instantiationsCount[_receivers[i]] = instantiationsCount[_receivers[i]] + 1;

            emit LogSplitPaymentInstantiation(_receivers[i], splitPayment);
        }

        emit LogSplitPaymentInstantiation(msg.sender, splitPayment);
    }

    /// @dev Checks if the percentages are valid. A valid percentage array should:
    /// 1. Summing up all percentages should be 100
    /// 2. All percentages must be more than 0
    /// @param _percentages - array of percentages to be validated
    /// @return Returns whether or not the percentages are summed up to 100 i.e. 100%
    function checkPercentagesValidity(uint256[] memory _percentages)
    private
    pure
    returns (bool)
    {
        uint256 summedPercentage = 0;
        for (uint i = 0; i < _percentages.length; i++) {
            require(_percentages[i] > 0, "SplitPaymentFactory::checkPercentagesValidity - ZERO_PERCENTAGE");
            summedPercentage = summedPercentage + _percentages[i];
        }

        return summedPercentage == 100;
    }
}
