import { describe, expect, it } from "vitest";
import { attachmentGridLayout } from "./attachment-grid-layout";

describe("attachment grid width budget", () => {
  it("fits complete images and reserves overflow even with only two files", () => {
    expect(attachmentGridLayout(70, [32, 32]).visible).toBe(2);
    expect(attachmentGridLayout(69, [32, 32])).toMatchObject({ visible: 0, hidden: 2 });
    expect(attachmentGridLayout(165, [32, 128])).toMatchObject({ visible: 1, hidden: 1 });
    expect(attachmentGridLayout(69, [128, 32])).toMatchObject({ visible: 0, hidden: 2 });
    expect(attachmentGridLayout(166, [128, 32])).toMatchObject({ visible: 2, hidden: 0 });
  });
  it("keeps original order, limits density, and accounts for multi-digit counters", () => {
    expect(attachmentGridLayout(204, [32, 128, 32, 32])).toMatchObject({ visible: 2, hidden: 2 });
    expect(attachmentGridLayout(203, [32, 128, 32, 32])).toMatchObject({ visible: 1, hidden: 3 });
    expect(attachmentGridLayout(1000, [32, 32, 32, 32])).toMatchObject({ visible: 3, hidden: 1 });
    expect(attachmentGridLayout(77, Array(26).fill(32))).toMatchObject({ visible: 1, hidden: 25 });
    expect(attachmentGridLayout(0, [32, 32])).toMatchObject({ visible: 0, hidden: 2 });
    expect(attachmentGridLayout(100, [])).toMatchObject({ visible: 0, hidden: 0 });
  });
});
