import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeJsonForScript } from "./JsonLd";

// Built from code points so the source file itself holds no invisible characters.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

describe("safeJsonForScript", () => {
  const hostile = { name: "</script><script>alert(1)</script>", note: `a & b > c${LS}${PS}` };

  it("never emits a closing script tag, angle brackets, ampersands or line separators", () => {
    const out = safeJsonForScript(hostile);
    assert.equal(out.includes("</script"), false);
    for (const ch of ["<", ">", "&", LS, PS]) assert.equal(out.includes(ch), false, `contains ${JSON.stringify(ch)}`);
  });
  it("still parses back to the same value", () => {
    assert.deepEqual(JSON.parse(safeJsonForScript(hostile)), hostile);
  });
});
