import { describe, it, expect } from "vitest";
import { canonicalize } from "../src/canonical.js";

describe("canonicalize", () => {
  it("sorts object keys lexicographically", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
  it("handles nested objects and arrays", () => {
    expect(canonicalize({ z: [3, { y: 1, x: 2 }], a: null })).toBe(
      '{"a":null,"z":[3,{"x":2,"y":1}]}',
    );
  });
  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });
  it("emits no whitespace", () => {
    expect(canonicalize({ a: 1, b: 2 })).not.toMatch(/\s/);
  });
  it("matches reference fixture used by the AOS server", () => {
    // This MUST equal the canonical form produced by supabase/functions/_shared/audit.ts
    const payload = {
      event: "review.created",
      actor_id: "user-1",
      actor_kind: "human",
      review_id: "rev-1",
      payload: { title: "X", scenarios: ["a", "b"] },
    };
    expect(canonicalize(payload)).toBe(
      '{"actor_id":"user-1","actor_kind":"human","event":"review.created","payload":{"scenarios":["a","b"],"title":"X"},"review_id":"rev-1"}',
    );
  });
});
