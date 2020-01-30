const shouldBeEqualBigNumbers = function (actual, expected) {
  String(actual).should.be.equal(String(web3.utils.toBN(expected)));
};

const shouldBeAnAddress = function (actual) {
  expect(String(actual)).to.match(/^0x[a-fA-F0-9]{40}$/g);
};

module.exports = {
  shouldBeEqualBigNumbers,
  shouldBeAnAddress
};
