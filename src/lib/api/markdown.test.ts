import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mdCell, mdLink, mdTable } from "./markdown";

describe("markdown tables", () => {
  it("escapes pipes and flattens newlines", () => {
    assert.equal(mdCell("a | b\nc"), "a \\| b c");
  });
  it("shows missing values as a dash", () => {
    assert.equal(mdCell(null), "—");
    assert.equal(mdCell(undefined), "—");
    assert.equal(mdCell(""), "—");
    assert.equal(mdCell(0), "0");
  });
  it("builds a header, rule and one line per row", () => {
    const t = mdTable(["A", "B"], [[1, null]]);
    assert.equal(t, "| A | B |\n| --- | --- |\n| 1 | — |");
  });
  it("strips brackets from link labels", () => {
    assert.equal(mdLink("x [y]", "https://e.com"), "[x y](https://e.com)");
    assert.equal(mdLink("x", null), "x");
  });
});
