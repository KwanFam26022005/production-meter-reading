import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Helper function to calculate WCAG 2.1 relative luminance and contrast ratio
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getRelativeLuminance([r, g, b]: [number, number, number]): number {
  const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hexToRgb(hex1));
  const l2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// 1. APPROVED SOURCE PALETTE EXACT HEX VALUES
// ---------------------------------------------------------------------------
test('Brand Dresscode: Source palette exact HEX values defined in index.css', () => {
  const cssPath = path.resolve('src/index.css');
  assert.ok(fs.existsSync(cssPath), 'index.css must exist');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const EXPECTED_SOURCE_TOKENS: Record<string, string> = {
    '--sgp-corporate-navy': '#003875',
    '--sgp-corporate-blue': '#415C94',
    '--sgp-corporate-yellow': '#FCC959',
    '--sgp-corporate-orange': '#F39200',
    '--sgp-corporate-digital-blue': '#0068FF',
    '--sgp-corporate-white': '#FFFFFF',
    '--sgp-corporate-porcelain': '#FCFCFC',
    '--sgp-corporate-black': '#181818',
    '--sgp-corporate-charcoal': '#252525',
    '--sgp-corporate-gray': '#5E5B5B',
  };

  for (const [token, hex] of Object.entries(EXPECTED_SOURCE_TOKENS)) {
    const pattern = new RegExp(`${token}:\\s*${hex}`, 'i');
    assert.ok(
      pattern.test(css),
      `CSS must define source token ${token} with exact value ${hex}`
    );
  }
});

// ---------------------------------------------------------------------------
// 2. DIGITAL DERIVED TOKENS & SEMANTIC UI MAPPINGS
// ---------------------------------------------------------------------------
test('Brand Dresscode: Digital derived tokens and semantic UI mappings exist', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');

  const EXPECTED_DERIVED_TOKENS = [
    '--sgp-navy-hover',
    '--sgp-navy-active',
    '--sgp-navy-subtle',
    '--sgp-blue-hover',
    '--sgp-blue-subtle',
    '--sgp-yellow-subtle',
    '--sgp-yellow-border',
    '--sgp-orange-subtle',
    '--sgp-orange-border',
    '--sgp-digital-blue-subtle',
    '--sgp-digital-blue-hover',
    '--sgp-border-derived',
    '--sgp-border-derived-strong',
    '--sgp-gray-muted',
    '--sgp-gray-light',
  ];

  for (const token of EXPECTED_DERIVED_TOKENS) {
    assert.ok(css.includes(token), `CSS must include derived token ${token}`);
  }

  const EXPECTED_SEMANTIC_MAPPINGS = [
    '--sgp-color-header: var(--sgp-corporate-navy)',
    '--sgp-color-navigation: var(--sgp-corporate-navy)',
    '--sgp-color-primary-action: var(--sgp-corporate-navy)',
    '--sgp-color-canvas: var(--sgp-corporate-porcelain)',
    '--sgp-color-surface: var(--sgp-corporate-white)',
    '--sgp-color-text: var(--sgp-corporate-black)',
    '--sgp-color-text-secondary: var(--sgp-corporate-gray)',
    '--sgp-color-accent: var(--sgp-corporate-yellow)',
  ];

  for (const mapping of EXPECTED_SEMANTIC_MAPPINGS) {
    assert.ok(
      css.includes(mapping),
      `CSS must include semantic mapping "${mapping}"`
    );
  }
});

// ---------------------------------------------------------------------------
// 3. FUNCTIONAL SEMANTIC STATUS TIER PRESERVATION
// ---------------------------------------------------------------------------
test('Brand Dresscode: Functional semantic statuses remain an independent tier', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');

  // Verify functional semantics are NOT overridden with digital blue or brand orange
  assert.ok(css.includes('--sgp-success: #167A5A'), 'Success must remain green #167A5A');
  assert.ok(css.includes('--sgp-warning: #A86200'), 'Warning must remain amber #A86200');
  assert.ok(css.includes('--sgp-danger: #B43A3A'), 'Danger must remain red #B43A3A');
});

// ---------------------------------------------------------------------------
// 4. MATHEMATICAL CONTRAST VALIDATION (WCAG 2.1 AA/AAA)
// ---------------------------------------------------------------------------
test('Brand Dresscode: Contrast ratios strictly satisfy WCAG 2.1 specifications', () => {
  // 1. Primary Navy #003875 on White #FFFFFF
  const navyWhiteContrast = getContrastRatio('#003875', '#FFFFFF');
  assert.ok(
    navyWhiteContrast >= 7.0,
    `Primary Navy on White must achieve AAA (>= 7.0:1), got ${navyWhiteContrast.toFixed(2)}:1`
  );

  // 2. Black #181818 on Porcelain #FCFCFC
  const blackPorcelainContrast = getContrastRatio('#181818', '#FCFCFC');
  assert.ok(
    blackPorcelainContrast >= 7.0,
    `Black on Porcelain must achieve AAA (>= 7.0:1), got ${blackPorcelainContrast.toFixed(2)}:1`
  );

  // 3. Charcoal #252525 on White #FFFFFF
  const charcoalWhiteContrast = getContrastRatio('#252525', '#FFFFFF');
  assert.ok(
    charcoalWhiteContrast >= 7.0,
    `Charcoal on White must achieve AAA (>= 7.0:1), got ${charcoalWhiteContrast.toFixed(2)}:1`
  );

  // 4. Gray #5E5B5B on White #FFFFFF
  const grayWhiteContrast = getContrastRatio('#5E5B5B', '#FFFFFF');
  assert.ok(
    grayWhiteContrast >= 4.5,
    `Corporate Gray on White must achieve AA (>= 4.5:1), got ${grayWhiteContrast.toFixed(2)}:1`
  );

  // 5. Corporate Blue #415C94 on White #FFFFFF
  const blueWhiteContrast = getContrastRatio('#415C94', '#FFFFFF');
  assert.ok(
    blueWhiteContrast >= 4.5,
    `Corporate Blue on White must achieve AA (>= 4.5:1), got ${blueWhiteContrast.toFixed(2)}:1`
  );

  // 6. Digital Blue #0068FF on White #FFFFFF
  const digitalBlueContrast = getContrastRatio('#0068FF', '#FFFFFF');
  assert.ok(
    digitalBlueContrast >= 4.5,
    `Digital Blue on White must achieve AA (>= 4.5:1), got ${digitalBlueContrast.toFixed(2)}:1`
  );

  // 7. Black #181818 on Corporate Yellow #FCC959
  const blackYellowContrast = getContrastRatio('#181818', '#FCC959');
  assert.ok(
    blackYellowContrast >= 7.0,
    `Black on Corporate Yellow must achieve AAA (>= 7.0:1), got ${blackYellowContrast.toFixed(2)}:1`
  );

  // 8. CRITICAL ACCESSIBILITY CONSTRAINT: White #FFFFFF on Yellow #FCC959 FAILS WCAG (< 3.0:1)
  const whiteYellowContrast = getContrastRatio('#FFFFFF', '#FCC959');
  assert.ok(
    whiteYellowContrast < 2.0,
    `White on Yellow fails contrast (< 2.0:1), verifying rule against white text on yellow`
  );
});

// ---------------------------------------------------------------------------
// 5. USER HOME HUB REDESIGN CSS CONTRACTS
// ---------------------------------------------------------------------------
test('Home Hub Redesign: Navigation, Progress Ring, and Insight Feed CSS classes present', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');

  const REQUIRED_SELECTORS = [
    '.workspace-container--with-bottom-nav',
    '.sgp-bottom-radial-bar',
    '.sgp-radial-fab',
    '.sgp-progress-ring-svg',
    '.sgp-progress-ring-track',
    '.sgp-progress-ring-fill',
    '.sgp-progress-ring-fill--neutral',
    '.sgp-radial-arc-layer',
    '.sgp-radial-arc-btn',
    '.sgp-radial-port-badge',
    '.sgp-insight-feed',
    '.sgp-insight-card',
    '.sgp-insight-card--priority',
    '.sgp-insight-card--warning',
    '.sgp-insight-eyebrow',
    '.sgp-insight-title',
    '.sgp-insight-desc',
    '.sgp-insight-primary-cta',
    '.sgp-insight-secondary-link',
    '.sgp-insight-progress-wrap',
  ];

  for (const selector of REQUIRED_SELECTORS) {
    assert.ok(
      css.includes(selector),
      `CSS must contain required selector ${selector}`
    );
  }
});

// ---------------------------------------------------------------------------
// 6. SKILL & DESIGN_DNA SYNCHRONICITY
// ---------------------------------------------------------------------------
test('Design Alignment: Skill and DESIGN_DNA.md are fully synchronized with source palette', () => {
  const skillPath = path.resolve('../.agent/skills/saigon-port-ui/SKILL.md');
  const dnaPath = path.resolve('DESIGN_DNA.md');

  assert.ok(fs.existsSync(skillPath), 'saigon-port-ui SKILL.md must exist');
  assert.ok(fs.existsSync(dnaPath), 'DESIGN_DNA.md must exist');

  const skillContent = fs.readFileSync(skillPath, 'utf-8');
  const dnaContent = fs.readFileSync(dnaPath, 'utf-8');

  // Both documents must contain all 10 source palette hex codes
  const HEX_CODES = [
    '#003875',
    '#415C94',
    '#FCC959',
    '#F39200',
    '#0068FF',
    '#FFFFFF',
    '#FCFCFC',
    '#181818',
    '#252525',
    '#5E5B5B',
  ];

  for (const hex of HEX_CODES) {
    assert.ok(
      skillContent.includes(hex),
      `SKILL.md must contain source hex code ${hex}`
    );
    assert.ok(
      dnaContent.includes(hex),
      `DESIGN_DNA.md must contain source hex code ${hex}`
    );
  }

  // Both documents must explicitly record provenance from user dresscode sheet
  assert.ok(
    skillContent.toLowerCase().includes('dresscode'),
    'SKILL.md must record dresscode provenance'
  );
  assert.ok(
    dnaContent.toLowerCase().includes('dresscode'),
    'DESIGN_DNA.md must record dresscode provenance'
  );

  // Both documents must include updated product scope modules
  const SCOPE_TERMS = ['Login', 'Home Hub', 'Đo đếm', 'Chấm công', 'Lịch', 'Admin'];
  for (const term of SCOPE_TERMS) {
    assert.ok(
      skillContent.includes(term),
      `SKILL.md must mention scope item "${term}"`
    );
    assert.ok(
      dnaContent.includes(term),
      `DESIGN_DNA.md must mention scope item "${term}"`
    );
  }
});
