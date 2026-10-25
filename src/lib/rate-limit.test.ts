import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RateLimiter } from "./rate-limit";
import { signupErrorMessage } from "./newsletter";

describe("RateLimiter", () => {
  it("allows up to the limit per window, then refuses", () => {
    const rl = new RateLimiter(3, 1000);
    assert.deepEqual([1, 2, 3, 4].map(() => rl.allow("ip", 0)), [true, true, true, false]);
  });
  it("resets after the window", () => {
    const rl = new RateLimiter(1, 1000);
    assert.equal(rl.allow("ip", 0), true);
    assert.equal(rl.allow("ip", 500), false);
    assert.equal(rl.allow("ip", 1000), true);
  });
  it("keeps keys independent and memory bounded", () => {
    const rl = new RateLimiter(1, 1000, 2);
    assert.equal(rl.allow("a", 0), true);
    assert.equal(rl.allow("b", 0), true);
    assert.equal(rl.allow("c", 0), true); // evicts the oldest instead of growing
    assert.equal((rl as unknown as { hits: Map<string, unknown> }).hits.size, 2);
  });
});

describe("signupErrorMessage", () => {
  it("only knows our own codes", () => {
    assert.match(signupErrorMessage("rate")!, /Too many/);
    assert.equal(signupErrorMessage("Your account is locked. Call +1-800"), null);
    assert.equal(signupErrorMessage("constructor"), null);
    assert.equal(signupErrorMessage(null), null);
  });
});
