#!/usr/bin/env bash
set -euo pipefail
cd /workspace/cayan
npm ci --cache /tmp/son-doz-npm --no-audit --no-fund
npm run build
