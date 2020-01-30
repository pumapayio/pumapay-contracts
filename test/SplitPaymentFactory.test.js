const {
  transferETH,
  transferTokens
} = require('./helpers/transferHelper');
const {assertRevert} = require('./helpers/assertionHelper');
const {shouldBeAnAddress} = require('./helpers/comparisonHelper');
const {splitPaymentErrors} = require('./helpers/errorHelpers');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const PMAToken = artifacts.require('MockMintableToken');
const SplitPayment = artifacts.require('SplitPayment');
const SplitPaymentFactory = artifacts.require('SplitPaymentFactory');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MINTED_TOKENS = web3.utils.toWei('1000000000', 'ether'); // 1 Billion PMA

contract('Split Payment Factory Smart Contract', async (accounts) => {
  const creatorAccountOne = accounts[ 0 ];
  const creatorAccountTwo = accounts[ 1 ];
  const tokenHolder = accounts[ 2 ];
  const notAReceiverAddress = accounts[ 9 ];

  const receivers = [ accounts[ 5 ], accounts[ 6 ], accounts[ 7 ], accounts[ 8 ] ];
  const percentages = [ 10, 20, 30, 40 ];

  let token;
  let splitPayment;
  let splitPaymentFactory;

  const checkInstantiationsCount = async (address, expected) => {
    let count = await splitPaymentFactory.instantiationsCount(address);
    assert.equal(String(count), String(expected));
  };

  beforeEach('Deploying new Split Payment Factory', async () => {
    splitPaymentFactory = await SplitPaymentFactory.new();
  });

  beforeEach('Deploying new Token', async () => {
    token = await PMAToken.new();
  });

  beforeEach('Issue tokens', async () => {
    await token.mint(tokenHolder, MINTED_TOKENS, {
      from: creatorAccountOne
    });
  });

  describe('Is Instantiation', () => {
    it('should be "true" for an address created from the factory', async () => {
      const tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      const intantiationAddress = tx.logs[ 0 ].args.instantiation;

      const result = await splitPaymentFactory.isInstantiation(intantiationAddress);
      expect(result, true);
    });

    it('should be "fasle" for an address NOT created from the factory', async () => {
      const result = await splitPaymentFactory.isInstantiation(creatorAccountOne);
      expect(result, false);
    });
  });

  describe('Instantiations Count', () => {
    beforeEach('Create a new split payment', async () => {
      await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
    });
    it('should set the count of smart contracts for the receivers to 1 when there are no instantiations', async () => {
      let expectedCount = 1;
      await checkInstantiationsCount(receivers[ 0 ], expectedCount);
    });

    it('should set the count of smart contracts for the creator to 1 when there are no instantiations', async () => {
      let expectedCount = 1;
      await checkInstantiationsCount(creatorAccountOne, expectedCount);
    });

    it('should increment the count of smart contracts for the receivers and creator', async () => {
      // There is already on created on "beforeEach()"
      let expectedCount = 1;
      // Lets create 4 more
      for (let i = 0; i < 4; i++) {
        await splitPaymentFactory.create(token.address, receivers, percentages, {
          from: creatorAccountOne
        });
        expectedCount++;
      }

      await checkInstantiationsCount(creatorAccountOne, expectedCount);
      for (let receiver of receivers) {
        await checkInstantiationsCount(receiver, expectedCount);
      }
    });

    it('should increment the count of smart contracts for the receivers when there are no instantiations', async () => {
      // There is already on created on "beforeEach()"
      let expectedCount = 1;
      await checkInstantiationsCount(creatorAccountOne, expectedCount);

      // Lets create a new one from a different creator
      await splitPaymentFactory.create(token.address,
        [ accounts[ 2 ], accounts[ 3 ] ],
        [ 50, 50 ], {
          from: creatorAccountTwo
        });

      await checkInstantiationsCount(creatorAccountTwo, expectedCount);
    });
  });

  describe('Contract Instantiations', () => {
    let contractAddresses = [];
    beforeEach('Create a new split payment', async () => {
      let tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      contractAddresses.push(tx.logs[ 0 ].args.instantiation);
    });

    it('should return the addresses of smart contracts the receiver is part of', async () => {
      // Go through all receivers
      for (let receiver of receivers) {
        // Get the count of their instantiations
        let count = await splitPaymentFactory.instantiationsCount(receiver);
        for (let i = 0; i < count; i++) {
          // Get all the instantiations
          const address = await splitPaymentFactory.instantiations(receiver, i);
          // check if they are actually addresses -> match regex
          shouldBeAnAddress(address);
          expect(address, contractAddresses[ 0 ]);
        }
      }
    });

    it('should return the addresses of smart contracts the for the creator', async () => {
      for (let i = 0; i < 4; i++) {
        let tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
          from: creatorAccountTwo
        });
        contractAddresses.push(tx.logs[ 0 ].args.instantiation);
      }
      const creatorOneInstantiation = await splitPaymentFactory.instantiations(creatorAccountOne, 0);
      shouldBeAnAddress(creatorOneInstantiation);
      expect(creatorOneInstantiation, contractAddresses[ 0 ]);

      let count = await splitPaymentFactory.instantiationsCount(creatorAccountTwo);

      for (let j = 0; j < count; j++) {
        const address = await splitPaymentFactory.instantiations(creatorAccountTwo, j);
        // check if they are actually addresses -> match regex
        shouldBeAnAddress(address);
        // first one is already there and it's for 'creatorAccountOne'
        expect(address, contractAddresses[ j + 1 ]);
      }
    });
  });

  describe('Split Payment instantiation', () => {
    it('should return correct token for the split payment', async () => {
      const tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      const address = tx.logs[ 0 ].args.instantiation;
      const splitPayment = await SplitPayment.at(address);
      const tokenAddress = await splitPayment.token();
      assert.equal(tokenAddress.toString(), token.address);
    });

    it('should return correct receivers for the split payment', async () => {
      const tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      const address = tx.logs[ 0 ].args.instantiation;
      splitPayment = await SplitPayment.at(address);

      for (let [ index, receiver ] of receivers.entries()) {
        const receiverAddress = await splitPayment.receivers(index);
        assert.equal(receiverAddress.toString(), receiver);
      }
    });

    it('should return correct percentages for the split payment', async () => {
      const tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      const address = tx.logs[ 0 ].args.instantiation;
      splitPayment = await SplitPayment.at(address);

      for (let [ index, percentage ] of percentages.entries()) {
        const scPercentage = await splitPayment.percentages(index);
        assert.equal(scPercentage.toString(), percentage);
      }
    });
  });

  describe('Logging', () => {
    it('should emit "LogSplitPaymentInstantiation" for each receiver', async () => {
      const tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      const logs = tx.logs;

      assert.equal(logs.length, receivers.length + 1);

      for (let [ index, receiver ] of receivers.entries()) {
        const args = logs[ index ].args;
        const address = args.instantiation;
        const actor = args.actor;
        shouldBeAnAddress(address);
        assert.equal(actor, receiver);
      }
    });

    it('should emit "LogSplitPaymentInstantiation" for creator', async () => {
      const tx = await splitPaymentFactory.create(token.address, receivers, percentages, {
        from: creatorAccountOne
      });
      const args = tx.logs[ receivers.length ].args;
      let address = args.instantiation;
      let actor = args.actor;

      assert.equal(actor, creatorAccountOne);
      shouldBeAnAddress(address);
    });
  });

  describe('Split Payment instantiation failure', () => {
    it('should fail if the token address is a ZERO_ADDRESS', async () => {
      await assertRevert(splitPaymentFactory.create(
        ZERO_ADDRESS,
        receivers,
        percentages,
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.zeroAddress
      );
    });
    it('should fail if one of the receiver address is a ZERO_ADDRESS', async () => {
      const wrongReceivers = [ accounts[ 2 ], accounts[ 3 ], accounts[ 4 ], ZERO_ADDRESS ];
      await assertRevert(splitPaymentFactory.create(
        token.address,
        wrongReceivers,
        percentages,
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.zeroAddress
      );
    });

    it('should fail if the receivers is an empty array', async () => {
      await assertRevert(splitPaymentFactory.create(
        token.address,
        [],
        percentages,
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.noAddresses
      );
    });

    it('should fail if one of the percentages is ZERO', async () => {
      const wrongPercentages = [ 10, 20, 0, 70 ];
      await assertRevert(splitPaymentFactory.create(
        token.address,
        receivers,
        wrongPercentages,
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.zeroPercentage
      );
    });

    it('should fail if the percentages is an empty array', async () => {
      await assertRevert(splitPaymentFactory.create(
        token.address,
        receivers,
        [],
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.noPercentages
      );
    });

    it('should fail if the percentages do not sum up to 100', async () => {
      const wrongPercentages = [ 10, 20, 30, 69 ]; // not matching up to 100 // sum = 99
      await assertRevert(splitPaymentFactory.create(
        token.address,
        receivers,
        wrongPercentages,
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.percentageSumMismatch
      );
    });

    it('should fail if there is a mismatch between receivers and percentages', async () => {
      const wrongPercentages = [ 10, 20, 30, 40 ]; // 4 percentages
      const wrongReceivers = [ accounts[ 2 ], accounts[ 3 ], accounts[ 4 ] ]; // 3 receicers
      await assertRevert(splitPaymentFactory.create(
        token.address,
        wrongReceivers,
        wrongPercentages,
        {
          from: creatorAccountOne
        }),
        splitPaymentErrors.addressPercentageMismatch
      );
    });
  });
});
