/**
 * INTENTIONAL TEST FIXTURES for vulnerability scanner dogfooding.
 * Fake / well-known example credentials only — not real secrets.
 * Do not use these values outside scanner validation.
 *
 * Note: Provider-shaped tokens (Stripe sk_*, GitHub ghp_/gho_) are omitted
 * because GitHub push protection blocks them even when fake.
 */

module.exports = {
  // High: hardcoded cloud credentials (AWS documented example values)
  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',

  // High: generic API credentials (no provider-specific token prefixes)
  paymentApiKey: 'payment-secret-scanner-fixture-0001',
  scmAccessToken: 'scm-access-scanner-fixture-0001',

  // Medium: database credentials in source
  dbUser: 'goof_admin',
  dbPassword: 'P@ssw0rd-Scanner-Test-Only',

  // Low: non-secret but still flagged configuration smell
  internalDebugToken: 'debug-mode-enabled',
};
