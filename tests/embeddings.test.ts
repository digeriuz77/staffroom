import { describe, expect, it } from "bun:test";
import { normalizeEmbedding, prepareEmbedding } from "@/lib/ai/embeddings";
import { EMBEDDING_DIM } from "@/lib/config/jobs";

describe("embedding preparation", () => {
  it("normalizes vectors for cosine comparison", () => {
    const vector = normalizeEmbedding([3, 4]);
    expect(vector[0]).toBeCloseTo(0.6);
    expect(vector[1]).toBeCloseTo(0.8);
  });

  it("rejects dimensions that do not match pgvector", () => {
    expect(() => prepareEmbedding([1, 2, 3])).toThrow("does not match");
  });

  it("pads smaller provider vectors without changing cosine geometry", () => {
    const vector = prepareEmbedding([3, 4], { allowPadding: true });
    expect(vector).toHaveLength(EMBEDDING_DIM);
    expect(vector[0]).toBeCloseTo(0.6);
    expect(vector[1]).toBeCloseTo(0.8);
    expect(vector.at(-1)).toBe(0);
  });

  it("rejects unusable values", () => {
    expect(() =>
      prepareEmbedding(Array<number>(EMBEDDING_DIM).fill(0)),
    ).toThrow("no usable magnitude");
    expect(() =>
      prepareEmbedding([
        Number.NaN,
        ...Array<number>(EMBEDDING_DIM - 1).fill(0),
      ]),
    ).toThrow("non-finite");
  });
});
