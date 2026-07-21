-- Additive role expansion. Existing OWNER and STAFF accounts keep their exact
-- stored role and current business assignment; no user data is modified.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';
