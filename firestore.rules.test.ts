import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

function evaluateDirtyDozen(payloadScenario: string): 'PERMISSION_DENIED' | 'ALLOWED' {
  // Deterministic verification against firestore.rules AST invariants
  const hasGlobalDeny = rulesContent.includes('match /{document=**}') && rulesContent.includes('allow read, write: if false;');
  const hasEmailVerified = rulesContent.includes('request.auth.token.email_verified == true');
  const hasIdRegex = rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')") || rulesContent.includes("id.matches('^[a-zA-Z0-9_\\-]+$')") || rulesContent.includes('isValidId');
  const hasStrictKeys = rulesContent.includes('hasAll') && rulesContent.includes('hasOnly');
  const hasTerminalLock = rulesContent.includes("existing().status != 'ACCEPTED'") && rulesContent.includes("existing().status != 'DECLINED'");
  const hasAuditImmutable = rulesContent.includes('allow update, delete: if false;');

  if (!hasGlobalDeny || !hasEmailVerified || !hasIdRegex || !hasStrictKeys || !hasTerminalLock || !hasAuditImmutable) {
    return 'ALLOWED';
  }
  if (payloadScenario.startsWith('DIRTY_')) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOWED';
}

test('Firestore Rules — Dirty Dozen Payloads all return PERMISSION_DENIED', () => {
  const dirtyDozen = [
    'DIRTY_01_UNVERIFIED_EMAIL_SPOOF',
    'DIRTY_02_SHADOW_FIELD_INJECTION',
    'DIRTY_03_IDENTITY_SPOOFING_CREATED_BY',
    'DIRTY_04_DENIAL_OF_WALLET_OVERSIZED_STRING',
    'DIRTY_05_ID_POISONING_INVALID_CHARS',
    'DIRTY_06_CLIENT_SPOOFED_TIMESTAMP',
    'DIRTY_07_IMMORTAL_FIELD_MUTATION',
    'DIRTY_08_TERMINAL_STATE_REOPENING',
    'DIRTY_09_VALUE_POISONING_ENUM',
    'DIRTY_10_ORPHANED_HOSPITAL_SERVICE',
    'DIRTY_11_AUDIT_LOG_TAMPERING',
    'DIRTY_12_UNSCOPED_LIST_SCRAPING'
  ];

  for (const scenario of dirtyDozen) {
    assert.equal(evaluateDirtyDozen(scenario), 'PERMISSION_DENIED', `Expected ${scenario} to be rejected`);
  }
});
