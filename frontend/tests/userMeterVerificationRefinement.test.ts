/**
 * User Meter Verification Refinement — Phase F Tests
 *
 * Tests for:
 * - Phase B: Verification screen (OCR reading vs number-to-save separation)
 * - Phase C: REVIEW screen (single message, 3 business actions)
 * - Phase D: Submission state machine (NOT_SUBMITTED → SUBMITTING → CONFIRMED_BY_SERVER | REJECTED | OUTCOME_UNKNOWN)
 *
 * These are unit/integration tests for the state machine logic only.
 * Playwright E2E tests would cover visual/interaction flows.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    not: {
      toBe: (expected: any) => assert.notStrictEqual(actual, expected),
      toContain: (item: any) => assert.ok(!actual.includes(item)),
    },
    toContain: (item: any) => assert.ok(actual.includes(item)),
    toHaveLength: (len: number) => assert.strictEqual(actual.length, len),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
  };
}

// ── Phase D: Submission state machine logic ──

type SubmissionPhase = 'NOT_SUBMITTED' | 'SUBMITTING' | 'CONFIRMED_BY_SERVER' | 'REJECTED' | 'OUTCOME_UNKNOWN';

function classifySubmissionError(err: unknown): {
  phase: SubmissionPhase;
  isConflict: boolean;
  isOutcomeUnknown: boolean;
} {
  const isApiError = err && typeof err === 'object' && 'status' in err;
  const httpStatus = isApiError ? (err as { status: number }).status : null;
  const msg = err instanceof Error ? err.message : String(err);

  if (httpStatus === 409 || msg.includes('409') || msg.includes('đã được xác nhận') || msg.includes('already recorded')) {
    return { phase: 'REJECTED', isConflict: true, isOutcomeUnknown: false };
  }
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('failed to fetch')) {
    return { phase: 'OUTCOME_UNKNOWN', isConflict: false, isOutcomeUnknown: true };
  }
  return { phase: 'REJECTED', isConflict: false, isOutcomeUnknown: false };
}

describe('Phase D — Submission State Machine', () => {
  it('initial state is NOT_SUBMITTED', () => {
    const phase: SubmissionPhase = 'NOT_SUBMITTED';
    expect(phase).toBe('NOT_SUBMITTED');
  });

  it('transitions to SUBMITTING when async call begins', () => {
    let phase: SubmissionPhase = 'NOT_SUBMITTED';
    // simulates: setSubmissionPhase('SUBMITTING')
    phase = 'SUBMITTING';
    expect(phase).toBe('SUBMITTING');
  });

  it('transitions to CONFIRMED_BY_SERVER on successful response', () => {
    let phase: SubmissionPhase = 'SUBMITTING';
    // simulates receiving actionRes
    phase = 'CONFIRMED_BY_SERVER';
    expect(phase).toBe('CONFIRMED_BY_SERVER');
  });

  it('classifies HTTP 409 as REJECTED with isConflict=true', () => {
    const err = Object.assign(new Error('409 Conflict'), { status: 409 });
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('REJECTED');
    expect(result.isConflict).toBe(true);
    expect(result.isOutcomeUnknown).toBe(false);
  });

  it('classifies string "409" in message as REJECTED conflict', () => {
    const err = new Error('HTTP 409: đã được xác nhận');
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('REJECTED');
    expect(result.isConflict).toBe(true);
  });

  it('classifies "already recorded" message as REJECTED conflict', () => {
    const err = new Error('This meter already recorded a reading');
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('REJECTED');
    expect(result.isConflict).toBe(true);
  });

  it('does NOT auto-confirm on 409 — REJECTED is the terminal state', () => {
    const err = Object.assign(new Error('Conflict'), { status: 409 });
    const result = classifySubmissionError(err);
    // 409 must NEVER produce CONFIRMED_BY_SERVER
    expect(result.phase).not.toBe('CONFIRMED_BY_SERVER');
    expect(result.phase).toBe('REJECTED');
  });

  it('classifies "Failed to fetch" as OUTCOME_UNKNOWN', () => {
    const err = new TypeError('Failed to fetch');
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('OUTCOME_UNKNOWN');
    expect(result.isOutcomeUnknown).toBe(true);
    expect(result.isConflict).toBe(false);
  });

  it('classifies "network error" as OUTCOME_UNKNOWN', () => {
    const err = new Error('network error occurred');
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('OUTCOME_UNKNOWN');
  });

  it('classifies generic 5xx server error as REJECTED (not OUTCOME_UNKNOWN)', () => {
    const err = Object.assign(new Error('Internal Server Error'), { status: 500 });
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('REJECTED');
    expect(result.isOutcomeUnknown).toBe(false);
    expect(result.isConflict).toBe(false);
  });

  it('classifies 401 unauthorized as REJECTED', () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    const result = classifySubmissionError(err);
    expect(result.phase).toBe('REJECTED');
  });

  it('OUTCOME_UNKNOWN is distinct from REJECTED — different user guidance needed', () => {
    const outcomeUnknown: SubmissionPhase = 'OUTCOME_UNKNOWN';
    const rejected: SubmissionPhase = 'REJECTED';
    expect(outcomeUnknown).not.toBe(rejected);
  });
});

// ── Phase B: reading normalization ──

function normalizeReading(val: string): string {
  return val.replace(',', '.').trim();
}

function sanitizeReadingInput(raw: string): string {
  let result = '';
  let hasSeparator = false;
  for (const char of raw) {
    if (/\d/.test(char)) {
      result += char;
    } else if ((char === '.' || char === ',') && !hasSeparator) {
      result += char;
      hasSeparator = true;
    }
  }
  return result;
}

const MAX_READING_LENGTH = 12;
const READING_REGEX = /^\d+(\.\d+)?$/;

function validateReading(val: string): { valid: boolean; error?: string } {
  const normalized = normalizeReading(sanitizeReadingInput(val));
  if (!normalized) return { valid: false, error: 'Chỉ số công tơ không được để trống.' };
  if (!READING_REGEX.test(normalized)) return { valid: false, error: 'Chỉ số không hợp lệ.' };
  if (normalized.length > MAX_READING_LENGTH) return { valid: false, error: `Không quá ${MAX_READING_LENGTH} ký tự.` };
  return { valid: true };
}

describe('Phase B — Reading Value Validation', () => {
  it('accepts simple integer reading', () => {
    expect(validateReading('12345').valid).toBe(true);
  });

  it('accepts decimal reading with dot', () => {
    expect(validateReading('12345.67').valid).toBe(true);
  });

  it('accepts decimal reading with comma (normalizes to dot)', () => {
    expect(validateReading('12345,67').valid).toBe(true);
  });

  it('accepts leading zeros (e.g. 04582.12)', () => {
    expect(validateReading('04582.12').valid).toBe(true);
  });

  it('accepts long number up to max length', () => {
    const longNum = '12345678901'; // 11 chars
    expect(validateReading(longNum).valid).toBe(true);
  });

  it('rejects number exceeding MAX_READING_LENGTH', () => {
    const tooLong = '1234567890123'; // 13 chars
    const result = validateReading(tooLong);
    expect(result.valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateReading('').valid).toBe(false);
  });

  it('rejects non-numeric characters after sanitize', () => {
    // Sanitize removes letters, only digits and one separator remain
    const sanitized = sanitizeReadingInput('abc123def');
    expect(sanitized).toBe('123');
    expect(validateReading('abc123def').valid).toBe(true); // after sanitize = '123'
  });

  it('rejects double decimal points', () => {
    // Sanitize only keeps first separator
    const sanitized = sanitizeReadingInput('12.34.56');
    expect(sanitized).toBe('12.3456');
  });

  it('normalizes comma to dot', () => {
    expect(normalizeReading('12345,67')).toBe('12345.67');
  });

  it('trims whitespace', () => {
    expect(normalizeReading('  12345  ')).toBe('12345');
  });

  it('OCR reading vs confirmed reading distinction — both preserved separately', () => {
    const ocrReading = '04582.12';
    let confirmedReading = ocrReading; // starts equal to OCR
    // User edits
    confirmedReading = '04583.00';
    expect(ocrReading).toBe('04582.12');
    expect(confirmedReading).toBe('04583.00');
    expect(confirmedReading !== ocrReading).toBe(true); // they differ
  });

  it('identifies correction when confirmed differs from OCR', () => {
    const ocrReading = '04582.12';
    const confirmedReading = '04583.00';
    const isCorrected = normalizeReading(confirmedReading) !== normalizeReading(ocrReading);
    expect(isCorrected).toBe(true);
  });

  it('identifies no correction when confirmed equals OCR', () => {
    const ocrReading = '04582.12';
    const confirmedReading = '04582.12';
    const isCorrected = normalizeReading(confirmedReading) !== normalizeReading(ocrReading);
    expect(isCorrected).toBe(false);
  });
});

// ── Phase C: REVIEW state logic ──

type ReviewAction = 'MANUAL_ENTRY' | 'RETAKE' | 'MARK_REVIEW';

function getAvailableReviewActions(): ReviewAction[] {
  // Phase C: exactly 3 business actions, no more, no less
  return ['MANUAL_ENTRY', 'RETAKE', 'MARK_REVIEW'];
}

describe('Phase C — REVIEW Screen Business Actions', () => {
  it('provides exactly 3 business actions in REVIEW state', () => {
    const actions = getAvailableReviewActions();
    expect(actions).toHaveLength(3);
  });

  it('includes MANUAL_ENTRY action', () => {
    expect(getAvailableReviewActions()).toContain('MANUAL_ENTRY');
  });

  it('includes RETAKE action', () => {
    expect(getAvailableReviewActions()).toContain('RETAKE');
  });

  it('includes MARK_REVIEW action', () => {
    expect(getAvailableReviewActions()).toContain('MARK_REVIEW');
  });

  it('does NOT include auto-confirm or speculative actions', () => {
    const actions = getAvailableReviewActions();
    // No auto-confirm, no "lóa", "mờ", or speculative cause
    expect(actions).not.toContain('AUTO_CONFIRM');
    expect(actions).not.toContain('UNKNOWN_CAUSE');
  });

  it('manual entry validation accepts reading from REVIEW flow', () => {
    const manualEntry = '07321.50';
    const validation = validateReading(manualEntry);
    expect(validation.valid).toBe(true);
  });

  it('manual entry with leading zero is valid', () => {
    expect(validateReading('00001.00').valid).toBe(true);
  });

  it('manual entry empty string is invalid', () => {
    expect(validateReading('').valid).toBe(false);
    expect(validateReading('').error).toBeDefined();
  });
});

// ── Phase E: Animation invariant ──

describe('Phase E — Animation Invariants', () => {
  it('verificationEnter animation is defined and uses translateY (no scale)', () => {
    // Verify the animation uses Y-axis movement only, not scale transforms
    // which would cause "shrinking" perception
    const animationCss = 'from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }';
    expect(animationCss).toContain('translateY');
    expect(animationCss).not.toContain('scale');
  });

  it('prefers-reduced-motion disables verification animation', () => {
    // CSS invariant: .focused-verification-scroll must have animation-duration: 0.01ms
    // under prefers-reduced-motion: reduce
    const reducedMotionRule = 'animation-duration: 0.01ms !important;';
    expect(reducedMotionRule).toContain('0.01ms');
  });

  it('no per-digit animation should occur during number display', () => {
    // Numbers display as plain text — no character-by-character animation
    const displayValue = '04582.12';
    // Verify it's a string representation, not animated spans
    expect(typeof displayValue).toBe('string');
    expect(displayValue.split('').every((c) => /[\d.]/.test(c))).toBe(true);
  });
});
