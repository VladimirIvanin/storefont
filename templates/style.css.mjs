/**
 * Stylesheet template for the generated fonts.
 *
 * The output is byte-compatible with the original InSales font-generator
 * build (gulp-iconfont-css + lodash template): a @font-face with all five
 * font formats, one `--icon-code-<name>` custom property per glyph on
 * `:root`, the shared `[class^="…-"]` base rule and per-glyph `:before`
 * rules with uppercase hex codepoints.
 */

/**
 * @param {object} options
 * @param {string} options.fontName  font-family and font file base name
 * @param {string} options.cssClass  class prefix ("icon" → `.icon-<name>`)
 * @param {string[]} options.icons   glyph names in codepoint order
 * @param {Map<string, number>} options.codepoints  glyph name → codepoint
 * @returns {string} stylesheet contents
 */
export function renderCss({ fontName, cssClass, icons, codepoints }) {
  const code = (name) => `\\${codepoints.get(name).toString(16).toUpperCase()}`;

  const fontFace = `@font-face {
	font-family: "${fontName}";
	src: url('${fontName}.eot');
	src: url('${fontName}.eot?#iefix') format('eot'),
		url('${fontName}.woff2') format('woff2'),
		url('${fontName}.woff') format('woff'),
		url('${fontName}.ttf') format('truetype'),
		url('${fontName}.svg#${fontName}') format('svg');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;

  const customProperties = icons
    .map((name) => `--icon-code-${name}: "${code(name)}";`)
    .join('');

  const baseRule = `[class^="${cssClass}-"], [class*=" ${cssClass}-"] {
  font-family: "${fontName}";
  speak: none;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;

  /* Better Font Rendering =========== */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;

  const glyphRules = icons
    .map(
      (name) => `
.${cssClass}-${name}:before {
	content: "${code(name)}";
}`,
    )
    .join('\n');

  return [fontFace, `:root {\n  ${customProperties}\n}`, baseRule, glyphRules, ''].join('\n');
}
