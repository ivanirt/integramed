import assert from "node:assert/strict";
import { test } from "node:test";
import { splitSubpaths } from "./iris-path";

test("splitSubpaths keeps one subpath and splits on a new moveto", () => {
  assert.deepEqual(splitSubpaths("M 0 0 L 1 1 Z"), ["M 0 0 L 1 1 Z"]);
  const two = splitSubpaths("M 0 0 L 1 1 Z M 2 2 L 3 3 Z");
  assert.equal(two.length, 2);
  assert.match(two[0], /^M 0 0/);
  assert.match(two[1], /^M 2 2/);
});

test("splitSubpaths treats implicit coordinates after M as the same subpath", () => {
  const subs = splitSubpaths("M 0 0 10 0 10 10 Z");
  assert.equal(subs.length, 1);
  assert.match(subs[0], /L 10 0/);
  assert.match(subs[0], /Z$/);
});

test("splitSubpaths keeps arc holes as separate subpaths", () => {
  const d =
    "M 600 440.6 A 159.4 159.4 0 0 0 600 759.4 Z M 600 500 A 100 100 0 0 1 600 700 Z";
  const subs = splitSubpaths(d);
  assert.equal(subs.length, 2);
  assert.match(subs[0], /A 159.4 159.4/);
  assert.match(subs[1], /A 100 100/);
});
