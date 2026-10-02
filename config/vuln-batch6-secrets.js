/**
 * INTENTIONAL TEST FIXTURES (batch 6) for vulnerability scanner dogfooding.
 * Fake / well-known example credentials only — not real secrets.
 */

module.exports = {
  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  paymentsToken: 'payments-scanner-fixture-batch6-0006',
  redisAuth: 'Redis-Batch6-Scanner-Only-P@ss',
  dbUser: 'goof_batch6',
  dbPassword: 'Batch6-Scanner-Only-P@ss',
  debugToggle: 'batch6-debug-enabled',
};
