# Security Specification — ReliefLedger Health

## 1. Data Invariants

1. **Identity & Email Verification**: Every write operation requires an authenticated user (`request.auth != null`) with `request.auth.token.email_verified == true`.
2. **Path Variable Hardening**: Every document ID path variable (`{userId}`, `{hospitalId}`, `{hospitalServiceId}`, `{referralId}`, `{logId}`) must satisfy `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
3. **Strict Schema & Shadow Field Rejection**: Every `create` and `update` operation must validate incoming payloads through a dedicated `isValid[Entity](incoming())` helper enforcing `hasAll` and `hasOnly` key checks, bounded string lengths, regex patterns, and enum allowlists.
4. **Temporal Integrity**: All `createdAt` and `updatedAt` fields on Firestore documents must equal `request.time`.
5. **Immortal Ownership Fields**: Ownership and origin fields (`uid`, `ownerUid`, `createdBy`, `actorId`, `createdAt`, `hospitalId`, `referralReference`) are immutable once created.
6. **Terminal State Locking**: Once a `Referral` reaches a terminal status (`ACCEPTED` or `DECLINED`), only an admin (`isAdmin()`) may mutate it further.
7. **Audit Log Immutability**: `audit_logs` documents are append-only (`allow update, delete: if false;`) and require `incoming().actorId == request.auth.uid`.
8. **Query Enforcement (`allow list`)**: No blanket `allow list: if isSignedIn();` is permitted. List queries must constrain `resource.data` by owner/creator (`resource.data.createdBy == request.auth.uid`, `resource.data.ownerUid == request.auth.uid`, `resource.data.actorId == request.auth.uid`, etc.).

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create `/users/user_1`. -> `PERMISSION_DENIED`
2. **Shadow Field Injection**: Creating `/referrals/ref_1` with an undeclared field `"isPriorityOverride": true`. -> `PERMISSION_DENIED`
3. **Identity Spoofing on Referral Creation**: User `uid_A` creating `/referrals/ref_1` with `createdBy: "uid_B"`. -> `PERMISSION_DENIED`
4. **Denial-of-Wallet Oversized String**: Creating `/referrals/ref_1` with a 5,000-character `coordinationNotes` field (exceeds `maxLength: 600`). -> `PERMISSION_DENIED`
5. **ID Poisoning Attack**: Writing to `/hospitals/bad$id!@#` with invalid characters outside `^[a-zA-Z0-9_\-]+$`. -> `PERMISSION_DENIED`
6. **Client-Spoofed Timestamp**: Creating `/audit_logs/log_1` with a past or future `createdAt` timestamp not equal to `request.time`. -> `PERMISSION_DENIED`
7. **Immortal Field Mutation**: Updating `/referrals/ref_1` to change `createdBy` or `referralReference`. -> `PERMISSION_DENIED`
8. **Terminal State Re-opening**: Updating a referral whose existing `status` is `'ACCEPTED'` back to `'PENDING'` as a non-admin user. -> `PERMISSION_DENIED`
9. **Value Poisoning on Update**: Updating `/hospital_services/hs_1` with an allowed key `capacityStatus` set to an invalid value `"INFINITE_BEDS"`. -> `PERMISSION_DENIED`
10. **Orphaned HospitalService Creation**: Creating `/hospital_services/hs_1` referencing a non-existent `hospitalId` where `exists(/databases/$(database)/documents/hospitals/$(incoming().hospitalId))` is false. -> `PERMISSION_DENIED`
11. **Audit Log Tampering**: Attempting to `update` or `delete` an existing `/audit_logs/log_1` document. -> `PERMISSION_DENIED`
12. **Unscoped List Scraping**: Attempting to `list` `/referrals` without constraining `resource.data.createdBy == request.auth.uid`. -> `PERMISSION_DENIED`
