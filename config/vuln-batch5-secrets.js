/**
 * INTENTIONAL TEST FIXTURES (batch 5) for vulnerability scanner dogfooding.
 * Fake / well-known example credentials only — not real secrets.
 */

module.exports = {
  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  webhookSecret: 'webhook-scanner-fixture-batch5-0005',
  smtpPassword: 'Smtp-Batch5-Scanner-Only-P@ss',
  dbUser: 'goof_batch5',
  dbPassword: 'Batch5-Scanner-Only-P@ss',
  debugToggle: 'batch5-debug-enabled',
};
