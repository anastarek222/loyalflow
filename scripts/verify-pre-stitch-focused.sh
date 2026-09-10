#!/usr/bin/env bash
set -euo pipefail

node --import tsx --test \
  tests/business-logo-policy-coverage.test.ts \
  tests/custom-card-upload-runtime-safety.test.ts \
  tests/custom-card-dimension-guard.test.ts \
  tests/tc33-custom-card-blob-lifecycle.test.ts
