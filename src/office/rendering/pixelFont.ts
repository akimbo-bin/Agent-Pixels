/**
 * A 3x5 pixel font for in-world screens (live status on furniture). Drawn as
 * crisp rectangles at any pixel scale, so text stays pixel art when the
 * buffer is magnified. Unknown characters render as a space.
 */
const G: Record<string, string> = {
  A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', J: '001001001101111',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '111101101101101', O: '111101101101111',
  P: '111101111100100', Q: '111101101111001', R: '111101110101101', S: '111100111001111', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111',
  '9': '111101111001111', '/': '001001010100100', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000',
  '%': '101001010100101', '_': '000000000000111', '(': '010100100100010', ')': '010001001001010', '?': '111001011000010',
};

/** Pixel width of a string at scale 1 (3 px per glyph + 1 px gap). */
export const textWidth = (text: string) => Math.max(0, text.length * 4 - 1);

export function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, k = 1) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = G[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * k, y + Math.floor(i / 3) * k, k, k);
    cx += 4 * k;
  }
}
