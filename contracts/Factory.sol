pragma solidity 0.5.16;

contract Factory {

    // ===============================================================================================================
    /// Events
    // ===============================================================================================================
    event LogContractInstantiation(address sender, address instantiation);

    // ===============================================================================================================
    /// Storage
    // ===============================================================================================================
    mapping(address => bool) public isInstantiation;
    mapping(address => address[]) public instantiations;

    // ===============================================================================================================
    /// Public functions
    // ===============================================================================================================
    /// @dev Returns number of instantiations by creator.
    /// @param creator Contract creator.
    /// @return Returns number of instantiations by creator.
    function getInstantiationCount(address creator)
    public
    view
    returns (uint)
    {
        return instantiations[creator].length;
    }

    // ===============================================================================================================
    /// Internal functions
    // ===============================================================================================================
    /// @dev Registers contract in factory registry.
    /// @param instantiation Address of contract instantiation.
    function register(address instantiation)
    internal
    {
        isInstantiation[instantiation] = true;
        instantiations[msg.sender].push(instantiation);

        emit LogContractInstantiation(msg.sender, instantiation);
    }
}
