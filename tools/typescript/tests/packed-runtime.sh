#!/bin/sh
# Build first, then exercise actual installed tarballs outside node_modules.
set -eu
PACKAGE_DIR=$(pwd)
FIXTURE=$(mktemp -d "${TMPDIR:-/tmp}/toolkit-runtime.XXXXXX")
trap 'rm -rf "$FIXTURE"' EXIT HUP INT TERM
TARBALL=$(npm pack --pack-destination "$FIXTURE" --silent)
mkdir "$FIXTURE/core" "$FIXTURE/storage"
cd "$FIXTURE/core"
npm init -y >/dev/null
npm install --engine-strict --omit=optional --ignore-scripts --no-audit --no-fund "$FIXTURE/$TARBALL"
cp "$PACKAGE_DIR/tests/packed-runtime.mjs" "$FIXTURE/core/smoke.mjs"
node "$FIXTURE/core/smoke.mjs" "$FIXTURE/core"
cd "$FIXTURE/storage"
npm init -y >/dev/null
SDK_VERSION=$(node -p "require('$PACKAGE_DIR/package-lock.json').packages['node_modules/@aws-sdk/client-s3'].version")
npm install --engine-strict --ignore-scripts --no-audit --no-fund "$FIXTURE/$TARBALL" "@aws-sdk/client-s3@$SDK_VERSION"
cp "$PACKAGE_DIR/tests/packed-runtime.mjs" "$FIXTURE/storage/smoke.mjs"
node "$FIXTURE/storage/smoke.mjs" "$FIXTURE/storage" storage
