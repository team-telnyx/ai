import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)));

test("the toolkit minimum runtime includes the optional S3 SDK runtime", () => {
  const sdkMinimum = lock.packages["node_modules/@aws-sdk/client-s3"].engines.node;
  assert.equal(sdkMinimum, ">=20.0.0");
  assert.equal(manifest.engines.node, ">=20.20.2",
    "the public runtime contract must not advertise Node 18/19 with a Node 20 S3 SDK");
  assert.equal(lock.packages[""].engines.node, manifest.engines.node);
  assert.equal(manifest.peerDependenciesMeta["@aws-sdk/client-s3"].optional, true);
});
