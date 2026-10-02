/**
 * INTENTIONAL TEST FIXTURES (batch 2) for vulnerability scanner dogfooding.
 * Fake / well-known example credentials only — not real secrets.
 */

module.exports = {
  // High: AWS documented example credentials
  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',

  // High: generic API credentials (avoid provider token prefixes blocked by push protection)
  billingSecret: 'billing-scanner-fixture-batch2-0002',
  warehouseToken: 'warehouse-scanner-fixture-batch2-0002',

  // Medium: DB credentials in source
  dbUser: 'goof_batch2',
  dbPassword: 'Batch2-Scanner-Only-P@ss',

  // Low: debug flag smell
  featureFlagSecret: 'batch2-debug-enabled',
};
