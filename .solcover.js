module.exports = {
  norpc: true,
  testCommand: 'npm run coverage',
  copyPackages: [ '@openzeppelin/contracts' ],
  skipFiles: [
    'Migrations.sol',
    'mocks/**.sol'
  ]
};
