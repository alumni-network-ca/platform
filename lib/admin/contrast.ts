/** WCAG contrast for the school's colours against the white text used on buttons. */
export function contrastRatio(hex: string, background = "#FFFFFF") {
  const luminance = (value: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return null;
    const rgb = [1, 3, 5].map((offset) => {
      const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  };
  const a = luminance(hex),
    b = luminance(background);
  return a === null || b === null ? null : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
