#!/usr/bin/env bash
# CI entrypoint for the problem_finder_web Jest test suite.
set -euo pipefail

npm install
npm test
