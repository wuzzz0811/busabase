/** Fixed grid items never wrap; reserve the overflow control before choosing a prefix. */
export function attachmentGridLayout(width: number, itemWidths: number[]) {
  const gap = 6;
  const total = itemWidths.length;
  const overflowWidth = (hidden: number) => Math.max(32, String(hidden).length * 8 + 16);
  for (let visible = Math.min(3, total); visible > 0; visible--) {
    const hidden = total - visible;
    const itemsWidth = itemWidths.slice(0, visible).reduce((sum, value) => sum + value, 0);
    const required =
      itemsWidth +
      Math.max(0, visible - 1) * gap +
      (hidden ? overflowWidth(hidden) + (visible ? gap : 0) : 0);
    if (required <= width) return { visible, hidden, overflowWidth: overflowWidth(hidden) };
  }
  return { visible: 0, hidden: total, overflowWidth: overflowWidth(total) };
}
