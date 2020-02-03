# Split Payment Factory - Specifications

## Introduction

The Split Payment Factory is a [factory smart contract](https://medium.com/@i6mi6/solidty-smart-contracts-design-patterns-ecfa3b1e9784), 
developed using the codebase from [Gnosis Multisig Wallet Factory](https://github.com/gnosis/MultiSigWallet/blob/master/contracts/Factory.sol).
  
## Scope

`SplitPaymentFactory.sol` - it includes the `SplitPayment.sol` and the `Factory.sol` contracts.

## Definition 

The split payment factory contract is a smart contract that deploys Split payment smart contracts.
It stores in mappings:
1. The instantiations of the split payment smart contracts per receiver and creator
2. The instantiation count for each receiver and creator
3. A boolean indicating that an address is an instantiation 

## How to use

The Split Payment Factory smart contract can be deployed without any parameters.
By calling the `create()` method, a new Split payment smart contract is being deployed. 
The `create()` method takes as params: 
1. `_token` - Token Address.
2. `_receivers` - Array of receiver addresses
3. `_percentages` - Array of percentages 

All the relevant checks that are required also for the `SplitPayment` are done.
It updates all the mappings accordingly:
1. Instantiations of the split payment smart contracts per creator
2. Instantiations of the split payment smart contracts per receiver
3. Increments the instantiation count for each creator
4. Increments the instantiation count for each receiver
5. Set the `isInstantiation` to true for the address of the newly deployed split payment smart contract

