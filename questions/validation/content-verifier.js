#!/usr/bin/env node
/**
 * Content Verifier
 *
 * Comprehensive content verification for question bank JSON files.
 * Detects: wrong answers, wrong explanations, garbled text,
 * duplicate options, and metadata mismatches.
 *
 * Usage: node questions/validation/content-verifier.js [directories...]
 * If no directories specified, scans ALL directories under questions/data/
 */

const fs = require('fs');
const path = require('path');

const QUESTIONS_DATA_DIR = path.join(__dirname, '..', 'data');

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a numeric value from text (option text, answer field, etc.).
 * Handles: plain numbers, fractions, mixed numbers, percentages, pi, units.
 */
function parseNumericValue(text) {
  if (text === null || text === undefined) return null;
  let s = String(text).trim();
  if (s === '') return null;

  // Strip common prefixes (currency)
  s = s.replace(/^(?:Rs\.?\s*|₹\s*|\$\s*)/i, '');
  // Strip common suffixes (units) — be careful not to strip too aggressively
  s = s.replace(/\s*(?:cm[²³]?|m[²³]?|mm[²³]?|km[²³]?|sq\.?\s*\w+|cubic\s*\w+|units?|°|degrees?)\s*$/i, '');
  s = s.trim();

  // Handle negative sign with space: "- 5" → "-5"
  s = s.replace(/^-\s+/, '-');

  // Handle π notation: "25π" or "π"
  const piMatch = s.match(/^(-?\d*\.?\d*)\s*[πΠpi]\s*$/i);
  if (piMatch) {
    const coeff = piMatch[1] === '' || piMatch[1] === '-'
      ? (piMatch[1] === '-' ? -1 : 1)
      : parseFloat(piMatch[1]);
    if (isNaN(coeff)) return null;
    return coeff * Math.PI;
  }

  // Handle percentage: "25%" → 25
  const pctMatch = s.match(/^(-?\d+\.?\d*)%$/);
  if (pctMatch) return parseFloat(pctMatch[1]);

  // Handle mixed numbers: "3 1/2"
  const mixedMatch = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return whole + (whole < 0 ? -1 : 1) * (num / den);
  }

  // Handle fractions: "2/3", "-1/4"
  const fracMatch = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return num / den;
  }

  // Handle plain numbers with commas: "1,000"
  s = s.replace(/,/g, '');
  // Strict check: entire remaining string must be a valid number (no trailing text)
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }

  return null;
}

/**
 * Compare two numbers with tolerance (handles floating point).
 * Uses absolute tolerance only (relative tolerance caused false positives
 * e.g. 5.67 ≈ 5.68 at 0.18% relative diff).
 */
function numbersAreEqual(a, b, tolerance) {
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (!isFinite(a) || !isFinite(b)) return false;
  tolerance = tolerance || 0.01;
  return Math.abs(a - b) < tolerance;
}

/**
 * Strict numeric equality for duplicate option detection.
 * Only matches truly equivalent values (e.g. "1/2" vs "0.5").
 */
function numbersAreEqualStrict(a, b) {
  return numbersAreEqual(a, b, 0.0001);
}

/**
 * Normalize text for comparison: lowercase, collapse whitespace, trim.
 */
function normalizeText(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Round a number for display (avoids floating point noise).
 */
function displayNum(n) {
  if (n === null || n === undefined) return 'null';
  if (Number.isInteger(n)) return String(n);
  // Check if it's very close to a simple fraction
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}

// ============================================================================
// ExpressionParser — Recursive descent parser for arithmetic (BODMAS)
// ============================================================================

class ExpressionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  consume() {
    return this.tokens[this.pos++];
  }

  // Expression: Term ((+|-) Term)*
  parseExpression() {
    let left = this.parseTerm();
    while (this.peek() && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  // Term: Power ((*|/) Power)*
  parseTerm() {
    let left = this.parsePower();
    while (this.peek() && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value;
      const right = this.parsePower();
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  // Power: Unary (^ Unary)* (right-associative)
  parsePower() {
    const base = this.parseUnary();
    if (this.peek() && this.peek().value === '^') {
      this.consume();
      const exp = this.parsePower(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  // Unary: (+|-) Unary | Atom
  parseUnary() {
    const token = this.peek();
    if (token && token.type === 'op') {
      if (token.value === '-') {
        this.consume();
        return -this.parseUnary();
      }
      if (token.value === '+') {
        this.consume();
        return this.parseUnary();
      }
    }
    return this.parseAtom();
  }

  // Atom: Number | '(' Expression ')'
  parseAtom() {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of expression');

    if (token.type === 'number') {
      this.consume();
      // Implicit multiplication: 3(4) → 3*4
      if (this.peek() && this.peek().value === '(') {
        const right = this.parseAtom();
        return token.value * right;
      }
      return token.value;
    }

    if (token.value === '(') {
      this.consume();
      const result = this.parseExpression();
      if (!this.peek() || this.peek().value !== ')') {
        throw new Error('Mismatched parenthesis');
      }
      this.consume(); // consume ')'
      // Implicit multiplication: (3)(4) → 3*4
      if (this.peek() && (this.peek().value === '(' || this.peek().type === 'number')) {
        if (this.peek().value === '(') {
          const right = this.parseAtom();
          return result * right;
        }
      }
      return result;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
}

// ============================================================================
// MathEvaluator — Extracts and evaluates math from question text
// ============================================================================

class MathEvaluator {
  /**
   * Try to compute the expected answer for a question.
   * Returns { value: number, confidence: string } or null.
   */
  computeAnswer(questionText) {
    if (!questionText) return null;
    const text = questionText.trim();

    // Try specialized patterns first
    const special = this.trySpecialPatterns(text);
    if (special !== null) return { value: special, confidence: 'high' };

    // Try expression extraction
    const expr = this.tryExpressionExtraction(text);
    if (expr !== null) return { value: expr, confidence: 'high' };

    return null;
  }

  trySpecialPatterns(text) {
    let match;

    // GCD/HCF of two numbers
    match = text.match(/(?:GCD|HCF|G\.C\.D|H\.C\.F|greatest\s+common\s+(?:divisor|factor)|highest\s+common\s+factor)\s+(?:of\s+)?(\d+)\s*(?:,\s*|\s+and\s+)(\d+)/i);
    if (match) return this.gcd(parseInt(match[1]), parseInt(match[2]));

    // GCD/HCF of three numbers
    match = text.match(/(?:GCD|HCF|G\.C\.D|H\.C\.F|greatest\s+common\s+(?:divisor|factor)|highest\s+common\s+factor)\s+(?:of\s+)?(\d+)\s*,\s*(\d+)\s*(?:,\s*|\s+and\s+)(\d+)/i);
    if (match) return this.gcd(this.gcd(parseInt(match[1]), parseInt(match[2])), parseInt(match[3]));

    // LCM of two numbers
    match = text.match(/(?:LCM|L\.C\.M|least\s+common\s+multiple|lowest\s+common\s+multiple)\s+(?:of\s+)?(\d+)\s*(?:,\s*|\s+and\s+)(\d+)/i);
    if (match) return this.lcm(parseInt(match[1]), parseInt(match[2]));

    // LCM of three numbers
    match = text.match(/(?:LCM|L\.C\.M|least\s+common\s+multiple|lowest\s+common\s+multiple)\s+(?:of\s+)?(\d+)\s*,\s*(\d+)\s*(?:,\s*|\s+and\s+)(\d+)/i);
    if (match) return this.lcm(this.lcm(parseInt(match[1]), parseInt(match[2])), parseInt(match[3]));

    // "What percentage of X is Y?" → Y/X × 100
    match = text.match(/what\s+percentage\s+of\s+([\d,.]+)\s+is\s+([\d,.]+)/i);
    if (match) {
      const x = parseFloat(match[1].replace(/,/g, ''));
      const y = parseFloat(match[2].replace(/,/g, ''));
      if (x !== 0) return (y / x) * 100;
    }

    // "Find X% of Y" or "What is X% of Y?"
    match = text.match(/(?:find|calculate|what\s+is)\s+([\d.]+)\s*%\s+of\s+([\d,.]+)/i);
    if (match) return (parseFloat(match[1]) / 100) * parseFloat(match[2].replace(/,/g, ''));

    // "X% of Y is ___"
    match = text.match(/([\d.]+)\s*%\s+of\s+([\d,.]+)\s*(?:=|is)/i);
    if (match) return (parseFloat(match[1]) / 100) * parseFloat(match[2].replace(/,/g, ''));

    // Additive inverse
    match = text.match(/additive\s+inverse\s+of\s+(-?\d+(?:\.\d+)?)/i);
    if (match) return -parseFloat(match[1]);

    // Successor of X (X + 1)
    match = text.match(/successor\s+of\s+(-?\d+)/i);
    if (match) return parseInt(match[1]) + 1;

    // Predecessor of X (X - 1)
    match = text.match(/predecessor\s+of\s+(-?\d+)/i);
    if (match) return parseInt(match[1]) - 1;

    // Reciprocal: "reciprocal of A/B" → B/A
    match = text.match(/reciprocal\s+of\s+(\d+)\s*\/\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1]);
      const den = parseInt(match[2]);
      if (num === 0) return null;
      return den / num;
    }

    // Absolute value
    match = text.match(/absolute\s+value\s+of\s+(-?\d+(?:\.\d+)?)/i);
    if (match) return Math.abs(parseFloat(match[1]));

    // ── Geometry ──

    // Area of rectangle
    match = text.match(/area\s+of\s+(?:a\s+)?rectangle.*?(?:length|l)\s*(?:=|is|:)?\s*([\d.]+)\s*(?:cm|m|mm|km|units?)?\s*(?:,?\s*and\s*|\s*,\s*)(?:width|breadth|w|b)\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return parseFloat(match[1]) * parseFloat(match[2]);

    // Area of rectangle (reversed order)
    match = text.match(/area\s+of\s+(?:a\s+)?rectangle.*?(?:breadth|width|b|w)\s*(?:=|is|:)?\s*([\d.]+)\s*(?:cm|m|mm|km|units?)?\s*(?:,?\s*and\s*|\s*,\s*)(?:length|l)\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return parseFloat(match[1]) * parseFloat(match[2]);

    // Area of square
    match = text.match(/area\s+of\s+(?:a\s+)?square.*?side\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return parseFloat(match[1]) ** 2;

    // Area of triangle (1/2 × base × height)
    match = text.match(/area\s+of\s+(?:a\s+)?triangle.*?base\s*(?:=|is|:)?\s*([\d.]+)\s*(?:cm|m|mm|km|units?)?\s*(?:,?\s*and\s*|\s*,\s*)(?:height|h)\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return 0.5 * parseFloat(match[1]) * parseFloat(match[2]);

    // Perimeter of rectangle
    match = text.match(/perimeter\s+of\s+(?:a\s+)?rectangle.*?(?:length|l)\s*(?:=|is|:)?\s*([\d.]+)\s*(?:cm|m|mm|km|units?)?\s*(?:,?\s*and\s*|\s*,\s*)(?:width|breadth|w|b)\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return 2 * (parseFloat(match[1]) + parseFloat(match[2]));

    // Perimeter of square
    match = text.match(/perimeter\s+of\s+(?:a\s+)?square.*?side\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return 4 * parseFloat(match[1]);

    // Volume of cuboid
    match = text.match(/volume\s+of\s+(?:a\s+)?(?:cuboid|rectangular\s+prism).*?(?:length|l)\s*(?:=|is|:)?\s*([\d.]+)\s*(?:cm|m|mm|km|units?)?\s*(?:,?\s*and?\s*|\s*,\s*)(?:width|breadth|w|b)\s*(?:=|is|:)?\s*([\d.]+)\s*(?:cm|m|mm|km|units?)?\s*(?:,?\s*and?\s*|\s*,\s*)(?:height|h)\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return parseFloat(match[1]) * parseFloat(match[2]) * parseFloat(match[3]);

    // Volume of cube
    match = text.match(/volume\s+of\s+(?:a\s+)?cube.*?(?:side|edge)\s*(?:=|is|:)?\s*([\d.]+)/i);
    if (match) return parseFloat(match[1]) ** 3;

    // ── Financial ──

    // Simple Interest: SI = PRT/100
    match = text.match(/(?:simple\s+interest|S\.?I\.?).*?(?:principal|P)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*).*?(?:rate|R)\s*(?:=|is)?\s*([\d.]+)\s*%?.*?(?:time|T|period|years?)\s*(?:=|is)?\s*([\d.]+)/i);
    if (match) {
      const P = parseFloat(match[1].replace(/,/g, ''));
      const R = parseFloat(match[2]);
      const T = parseFloat(match[3]);
      return (P * R * T) / 100;
    }

    // Profit: SP - CP (when asked for profit)
    match = text.match(/(?:find|calculate|what\s+is)\s+(?:the\s+)?(?:profit|gain).*?(?:cost\s+price|CP|C\.P\.?)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*).*?(?:selling\s+price|SP|S\.P\.?)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*)/i);
    if (match) return parseFloat(match[2].replace(/,/g, '')) - parseFloat(match[1].replace(/,/g, ''));

    // Profit (reversed order)
    match = text.match(/(?:find|calculate|what\s+is)\s+(?:the\s+)?(?:profit|gain).*?(?:selling\s+price|SP|S\.P\.?)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*).*?(?:cost\s+price|CP|C\.P\.?)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*)/i);
    if (match) return parseFloat(match[1].replace(/,/g, '')) - parseFloat(match[2].replace(/,/g, ''));

    // Loss: CP - SP (when asked for loss)
    match = text.match(/(?:find|calculate|what\s+is)\s+(?:the\s+)?loss.*?(?:cost\s+price|CP|C\.P\.?)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*).*?(?:selling\s+price|SP|S\.P\.?)\s*(?:=|is)?\s*(?:Rs\.?\s*|₹\s*)?(\d[\d,]*)/i);
    if (match) return parseFloat(match[1].replace(/,/g, '')) - parseFloat(match[2].replace(/,/g, ''));

    // Unit conversion
    match = text.match(/convert\s+([\d.]+)\s*(km|m|cm|mm|kg|g|mg|l|ml|kl)\s+(?:to|into)\s+(km|m|cm|mm|kg|g|mg|l|ml|kl)/i);
    if (match) return this.convertUnit(parseFloat(match[1]), match[2].toLowerCase(), match[3].toLowerCase());

    return null;
  }

  tryExpressionExtraction(text) {
    let match;

    // Helper: try evaluating, stripping trailing "= ___" or "=" if present
    const tryEval = (expr) => {
      expr = expr.replace(/\s*=\s*[_?.…]+\s*$/, '').trim();
      expr = expr.replace(/\s*=\s*$/, '').trim();
      // Also try "X of Y" as "X * Y" for fraction-of-number (e.g. "1/3 of 90")
      const fracOfMatch = expr.match(/^(\d+\s*\/\s*\d+)\s+of\s+(\d+(?:\.\d+)?)$/i);
      if (fracOfMatch) {
        const frac = this.evaluateExpression(fracOfMatch[1]);
        if (frac !== null) return frac * parseFloat(fracOfMatch[2]);
      }
      return this.evaluateExpression(expr);
    };

    // Pattern: "Calculate: [expr]" / "Evaluate: [expr]" / "Simplify: [expr]"
    match = text.match(/(?:calculate|compute|evaluate|simplify)\s*:\s*(.+?)(?:\.\s*$|\?|$)/i);
    if (match) {
      const result = tryEval(match[1].trim());
      if (result !== null) return result;
    }

    // Pattern: "What is the value/result of [expr]?" (with optional colon)
    match = text.match(/what\s+is\s+the\s+(?:value|result)\s+of\s*:?\s*(.+?)(?:\?|\.?\s*$)/i);
    if (match) {
      const result = tryEval(match[1].trim());
      if (result !== null) return result;
    }

    // Pattern: "What is [expr]?" (generic — after more specific patterns)
    match = text.match(/what\s+is\s+(.+?)(?:\?|\.?\s*$)/i);
    if (match) {
      const result = tryEval(match[1].trim());
      if (result !== null) return result;
    }

    // Pattern: "Find the value of [expr]"
    match = text.match(/find\s+(?:the\s+)?(?:value|result)\s+of\s+(.+?)(?:\?|\.?\s*$)/i);
    if (match) {
      const result = tryEval(match[1].trim());
      if (result !== null) return result;
    }

    // Pattern: "Find X of Y" where X is a fraction/percentage (e.g. "Find 1/2 of 48")
    match = text.match(/(?:find|what\s+is|calculate)\s+(\d+\s*\/\s*\d+)\s+of\s+(\d+(?:\.\d+)?)/i);
    if (match) {
      const frac = this.evaluateExpression(match[1]);
      if (frac !== null) return frac * parseFloat(match[2]);
    }

    // Pattern: "Find: [expr]"
    match = text.match(/find\s*:\s*(.+?)(?:\.\s*$|\?|$)/i);
    if (match) {
      const result = tryEval(match[1].trim());
      if (result !== null) return result;
    }

    // Pattern: "[expr] = ?" or "[expr] = ___"
    match = text.match(/^(.+?)\s*=\s*(?:\?|_+|\.\.\.)\s*[.?]?\s*$/);
    if (match) {
      const result = this.evaluateExpression(match[1].trim());
      if (result !== null) return result;
    }

    // Pattern: "If x = [value], find [expr]" (1 variable)
    match = text.match(/if\s+(\w)\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*(?:find|what\s+is|calculate|evaluate|the\s+value\s+of)\s*:?\s*(.+?)(?:\?|\.?\s*$)/i);
    if (match) {
      let expr = match[3].trim();
      // Strip "the value of" prefix if present
      expr = expr.replace(/^(?:the\s+)?(?:value|result)\s+of\s+/i, '');
      expr = this.substituteVariable(expr, match[1], parseFloat(match[2]));
      const result = tryEval(expr);
      if (result !== null) return result;
    }

    // Pattern: "If x = [val] and y = [val], find [expr]" (2 variables)
    match = text.match(/if\s+(\w)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*|\s+and\s+)(\w)\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*(?:find|what\s+is|calculate|evaluate|the\s+value\s+of)\s*:?\s*(.+?)(?:\?|\.?\s*$)/i);
    if (match) {
      let expr = match[5].trim();
      expr = expr.replace(/^(?:the\s+)?(?:value|result)\s+of\s+/i, '');
      expr = this.substituteVariable(expr, match[1], parseFloat(match[2]));
      expr = this.substituteVariable(expr, match[3], parseFloat(match[4]));
      const result = tryEval(expr);
      if (result !== null) return result;
    }

    // Pattern: "If x = [val], y = [val], and z = [val], find [expr]" (3 variables)
    match = text.match(/if\s+(\w)\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*(\w)\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*(?:and\s+)?(\w)\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*(?:find|what\s+is|calculate|evaluate|(?:then\s+)?the\s+value\s+of)\s*:?\s*(.+?)(?:\?|\.?\s*$)/i);
    if (match) {
      let expr = match[7].trim();
      expr = expr.replace(/^(?:the\s+)?(?:value|result)\s+of\s+/i, '');
      expr = this.substituteVariable(expr, match[1], parseFloat(match[2]));
      expr = this.substituteVariable(expr, match[3], parseFloat(match[4]));
      expr = this.substituteVariable(expr, match[5], parseFloat(match[6]));
      const result = tryEval(expr);
      if (result !== null) return result;
    }

    return null;
  }

  substituteVariable(expr, varName, value) {
    const esc = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Coefficient: "3x" → "3*(value)"
    expr = expr.replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${esc}(?!\\w)`, 'g'), `$1*(${value})`);
    // Standalone variable
    expr = expr.replace(new RegExp(`(?<![a-zA-Z])${esc}(?![a-zA-Z])`, 'g'), `(${value})`);
    return expr;
  }

  evaluateExpression(exprStr) {
    if (!exprStr || exprStr.length > 300) return null;

    // Before normalizing ÷, handle "÷ a/b" patterns — treat a/b as a fraction
    // e.g., "6 ÷ 1/2" → "6 ÷ (1/2)" so it evaluates as 6/(1/2)=12 not (6/1)/2=3
    let normalized = exprStr
      .replace(/÷\s*(\d+)\s*\/\s*(\d+)/g, '÷ ($1/$2)');

    // Normalize operators and brackets
    normalized = normalized
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove trailing period
    normalized = normalized.replace(/\.\s*$/, '').trim();
    // Remove wrapping quotes
    normalized = normalized.replace(/^['"]+|['"]+$/g, '').trim();

    // Bail if it looks like it has too much natural language
    if (/[a-zA-Z]{3,}/.test(normalized)) return null;

    const tokens = this.tokenize(normalized);
    if (!tokens || tokens.length === 0) return null;

    try {
      const parser = new ExpressionParser(tokens);
      const result = parser.parseExpression();
      // Must consume all tokens
      if (parser.pos < tokens.length) return null;
      if (!isFinite(result)) return null;
      return result;
    } catch {
      return null;
    }
  }

  tokenize(expr) {
    const tokens = [];
    let i = 0;

    while (i < expr.length) {
      if (expr[i] === ' ') { i++; continue; }

      // Number (including decimal)
      if (/[0-9]/.test(expr[i]) || (expr[i] === '.' && i + 1 < expr.length && /[0-9]/.test(expr[i + 1]))) {
        let num = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          num += expr[i++];
        }
        const val = parseFloat(num);
        if (isNaN(val)) return null;
        tokens.push({ type: 'number', value: val });
        continue;
      }

      // Operators and parens
      if ('+-*/^()'.includes(expr[i])) {
        tokens.push({ type: 'op', value: expr[i] });
        i++;
        continue;
      }

      // Skip commas (thousands separator)
      if (expr[i] === ',') { i++; continue; }

      // Unknown character — bail
      return null;
    }

    return tokens;
  }

  gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
  }

  lcm(a, b) {
    if (a === 0 && b === 0) return 0;
    return Math.abs(a * b) / this.gcd(a, b);
  }

  convertUnit(value, from, to) {
    const lengthToM = { km: 1000, m: 1, cm: 0.01, mm: 0.001 };
    const massToG = { kg: 1000, g: 1, mg: 0.001 };
    const volumeToL = { kl: 1000, l: 1, ml: 0.001 };

    if (lengthToM[from] !== undefined && lengthToM[to] !== undefined) {
      return value * lengthToM[from] / lengthToM[to];
    }
    if (massToG[from] !== undefined && massToG[to] !== undefined) {
      return value * massToG[from] / massToG[to];
    }
    if (volumeToL[from] !== undefined && volumeToL[to] !== undefined) {
      return value * volumeToL[from] / volumeToL[to];
    }
    return null;
  }
}

// ============================================================================
// ExplanationChecker — Verifies explanation-answer consistency
// ============================================================================

class ExplanationChecker {
  /**
   * Check if explanation_correct is consistent with the actual correct answer.
   * Returns array of error objects or empty array.
   */
  check(question) {
    const errors = [];
    if (!question.explanation_correct) return errors;

    const explText = question.explanation_correct;
    const correctAnswer = question.correct_answer;

    // Extract numeric values mentioned near "answer" keywords in explanation
    const mentionedValues = this.extractAnswerValues(explText);
    const mentionedLetters = this.extractOptionLetters(explText);
    const mentionedBooleans = this.extractBooleans(explText);

    if (question.type === 'mcq' && question.options) {
      const correctOption = question.options.find(o => o.id === correctAnswer);
      if (!correctOption) return errors;
      const correctOptionValue = parseNumericValue(correctOption.text);

      // Check if explanation mentions a specific numeric answer that contradicts
      for (const mv of mentionedValues) {
        if (correctOptionValue !== null && !numbersAreEqual(mv, correctOptionValue)) {
          // Check if the mentioned value matches any OTHER option — that's a strong signal of error
          const matchesWrongOption = question.options.some(
            o => o.id !== correctAnswer && numbersAreEqual(mv, parseNumericValue(o.text))
          );
          if (matchesWrongOption) {
            errors.push({
              severity: 'high',
              type: 'wrong_explanation',
              message: `Explanation says answer is ${displayNum(mv)} but correct option ${correctAnswer} says '${correctOption.text}'`
            });
          }
        }
      }

      // Check if explanation mentions a different option letter
      for (const letter of mentionedLetters) {
        if (letter !== correctAnswer) {
          errors.push({
            severity: 'high',
            type: 'wrong_explanation',
            message: `Explanation references option '${letter}' but correct_answer is '${correctAnswer}'`
          });
        }
      }
    }

    if (question.type === 'true_false') {
      // correct_answer "A" = True, "B" = False
      const isTrue = correctAnswer === 'A' || String(correctAnswer).toLowerCase() === 'true';
      for (const mb of mentionedBooleans) {
        if (mb !== isTrue) {
          errors.push({
            severity: 'high',
            type: 'wrong_explanation',
            message: `Explanation says '${mb ? 'True' : 'False'}' but correct_answer indicates '${isTrue ? 'True' : 'False'}'`
          });
        }
      }
    }

    if (question.type === 'fill_blank') {
      const answerValue = parseNumericValue(question.correct_answer);
      for (const mv of mentionedValues) {
        if (answerValue !== null && !numbersAreEqual(mv, answerValue)) {
          errors.push({
            severity: 'high',
            type: 'wrong_explanation',
            message: `Explanation says answer is ${displayNum(mv)} but correct_answer is '${question.correct_answer}'`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Extract numeric values mentioned near answer-related keywords.
   */
  extractAnswerValues(text) {
    const values = [];
    // Conservative patterns: only extract values explicitly called "the answer"
    // Avoid intermediate computation values ("gives us 6", "which is 42")
    // Capture fractions (e.g., "3/4") as well as plain numbers
    const NUM = '(-?\\d+(?:\\.\\d+)?(?:/\\d+)?)';
    const patterns = [
      new RegExp(`(?:the\\s+)?answer\\s+(?:is|=|equals)\\s+${NUM}`, 'gi'),
      new RegExp(`(?:the\\s+)?correct\\s+(?:answer|value)\\s+(?:is|=|equals)\\s+(?:[A-D]\\)?\\s*)?${NUM}`, 'gi'),
      new RegExp(`(?:so|therefore|hence|thus)[,\\s]+(?:the\\s+)?(?:answer\\s+)?(?:is\\s+)?${NUM}\\s*[.,]`, 'gi'),
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const val = parseNumericValue(match[1]);
        if (val !== null && isFinite(val)) {
          values.push(val);
        }
      }
    }

    return values;
  }

  /**
   * Extract option letter references (A/B/C/D) near "answer"/"correct" keywords.
   */
  extractOptionLetters(text) {
    const letters = [];
    // "correct answer is B", "answer is B)", "option A is correct"
    const patterns = [
      /(?:correct\s+)?answer\s+is\s+([A-D])(?:\)|\.|\s|,|$)/gi,
      /option\s+([A-D])\s+is\s+(?:the\s+)?correct/gi,
      /(?:the\s+)?correct\s+option\s+is\s+([A-D])/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        letters.push(match[1].toUpperCase());
      }
    }

    return [...new Set(letters)];
  }

  /**
   * Extract True/False conclusion from explanation.
   */
  extractBooleans(text) {
    const bools = [];
    // "statement is true", "this is false", "the answer is true"
    const patterns = [
      /(?:statement|this|answer)\s+is\s+(true|false)/gi,
      /(?:therefore|hence|so)\s*,?\s*(?:the\s+(?:statement|answer)\s+is\s+)?(true|false)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        bools.push(match[1].toLowerCase() === 'true');
      }
    }

    return bools;
  }
}

// ============================================================================
// GarbledTextDetector — Detects template artifacts, broken grammar, etc.
// ============================================================================

class GarbledTextDetector {
  constructor() {
    this.patterns = [
      // Double words (but not math like "x × x")
      { name: 'double_word', regex: /\b(the|is|are|was|were|a|an|of|in|to|for|and|or|that|this|it|be|has|have|had|do|does|did|will|would|can|could|should|shall|may|might|must|not|no|but|if|when|what|which|who|how|where|there|their|they|then|than|each|with|from|on|at|by|as|its|his|her)\s+\1\b/gi, severity: 'medium' },
      // Template artifacts (exclude XXX in Roman numeral context — XXX=30, XXXIV, etc.)
      { name: 'placeholder', regex: /\[INSERT\]|\{[a-z_]+\}|TODO|FIXME|(?<![IVXLCDM])XXX(?![IVXLCDM])|PLACEHOLDER/gi, severity: 'medium' },
      // "the their", "a an" (article confusion — exclude "an A" which is valid grammar e.g. "an A chain")
      { name: 'article_confusion', regex: /\b(?:the\s+their|their\s+the)\b/gi, severity: 'medium' },
      // Unicode artifacts
      { name: 'unicode_artifact', regex: /\uFFFD|\u200B|\u200C|\u200D|\uFEFF/g, severity: 'medium' },
      // Excessive whitespace (5+ consecutive spaces or 2+ newlines — skip 3-4 spaces used in match-the-following tables)
      { name: 'excessive_whitespace', regex: / {5,}|\n\s*\n\s*\n/g, severity: 'medium' },
      // "NaN" as literal text — code artifact (skip "undefined" which is a legitimate math word: "division by zero is undefined", "tan 90° is undefined", "f(x) is undefined at x=2")
      { name: 'code_artifact', regex: /\bNaN\b/g, severity: 'medium' },
    ];
  }

  /**
   * Check text for garbled patterns. Returns array of issues.
   */
  check(text, fieldName) {
    if (!text) return [];
    const issues = [];

    for (const pattern of this.patterns) {
      // Reset lastIndex for global regexes
      pattern.regex.lastIndex = 0;
      const matches = text.match(pattern.regex);
      if (matches) {
        issues.push({
          severity: pattern.severity,
          type: 'garbled_text',
          message: `${fieldName}: ${pattern.name} detected — '${matches[0].substring(0, 40)}'`
        });
      }
    }

    // Check for text ending abruptly (no punctuation) — only for explanations
    // (question_text and option_text often intentionally end without punctuation)
    if (fieldName === 'explanation_correct' || fieldName === 'explanation_incorrect') {
      const trimmed = text.trim();
      if (trimmed.length > 40 && !/[.!?:;'")}\]%]$/.test(trimmed) && !/\d$/.test(trimmed)) {
        if (trimmed.includes(' ') && /[a-zA-Z]/.test(trimmed)) {
          issues.push({
            severity: 'low',
            type: 'garbled_text',
            message: `${fieldName}: text may end abruptly without punctuation`
          });
        }
      }
    }

    return issues;
  }
}

// ============================================================================
// ContentVerifier — Main orchestrator
// ============================================================================

class ContentVerifier {
  constructor() {
    this.mathEval = new MathEvaluator();
    this.explChecker = new ExplanationChecker();
    this.garbledDetector = new GarbledTextDetector();
    this.errors = [];
    this.stats = {
      totalFiles: 0,
      totalQuestions: 0,
      byDirectory: {}
    };
  }

  /**
   * Verify a single question file.
   */
  verifyFile(filePath) {
    let fileData;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      fileData = JSON.parse(content);
    } catch (e) {
      this.errors.push({
        file: path.relative(QUESTIONS_DATA_DIR, filePath),
        question_id: null,
        severity: 'critical',
        type: 'parse_error',
        message: `Failed to parse file: ${e.message}`,
        question_text: null,
        correct_answer: null,
        computed_answer: null
      });
      return;
    }

    const relPath = path.relative(QUESTIONS_DATA_DIR, filePath);
    const questions = fileData.questions || [];

    this.stats.totalFiles++;
    this.stats.totalQuestions += questions.length;

    // Metadata checks (file-level)
    this.checkMetadata(fileData, relPath);

    // Per-question checks
    for (const q of questions) {
      this.verifyQuestion(q, fileData, relPath);
    }
  }

  /**
   * Verify a single question.
   */
  verifyQuestion(q, fileData, relPath) {
    // 1. Wrong Answer check (math questions only)
    this.checkWrongAnswer(q, relPath);

    // 2. Duplicate Options check
    this.checkDuplicateOptions(q, relPath);

    // 3. Wrong Explanation check
    this.checkWrongExplanation(q, relPath);

    // 4. Garbled Text check
    this.checkGarbledText(q, relPath);

    // 5. Metadata per-question checks
    this.checkQuestionMetadata(q, fileData, relPath);
  }

  /**
   * Check if the correct answer is mathematically wrong.
   */
  checkWrongAnswer(q, relPath) {
    if (!q.question_text) return;

    const computed = this.mathEval.computeAnswer(q.question_text);
    if (!computed) return; // Can't compute, skip

    const computedValue = computed.value;

    if (q.type === 'mcq' && q.options) {
      const correctOption = q.options.find(o => o.id === q.correct_answer);
      if (!correctOption) return;

      const optionValue = parseNumericValue(correctOption.text);
      if (optionValue === null) return; // Can't parse option text as number

      if (!numbersAreEqual(computedValue, optionValue)) {
        // Double check: does any other option match the computed answer?
        const matchingOption = q.options.find(o =>
          o.id !== q.correct_answer && numbersAreEqual(computedValue, parseNumericValue(o.text))
        );
        // Only flag if we have strong evidence (computed matches another option, or no option matches)
        this.errors.push({
          file: relPath,
          question_id: q.question_id,
          severity: 'critical',
          type: 'wrong_answer',
          message: `Computed answer is ${displayNum(computedValue)} but correct option ${q.correct_answer} says '${correctOption.text}'${matchingOption ? ` (option ${matchingOption.id} = '${matchingOption.text}' matches)` : ''}`,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          computed_answer: displayNum(computedValue)
        });
      }
    }

    if (q.type === 'fill_blank') {
      const answerValue = parseNumericValue(q.correct_answer);
      if (answerValue === null) return;

      if (!numbersAreEqual(computedValue, answerValue)) {
        this.errors.push({
          file: relPath,
          question_id: q.question_id,
          severity: 'critical',
          type: 'wrong_answer',
          message: `Computed answer is ${displayNum(computedValue)} but correct_answer is '${q.correct_answer}'`,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          computed_answer: displayNum(computedValue)
        });
      }
    }
  }

  /**
   * Check for duplicate MCQ options.
   */
  checkDuplicateOptions(q, relPath) {
    if (q.type !== 'mcq' || !q.options) return;

    const seen = new Map(); // normalized text → option id

    for (const opt of q.options) {
      if (!opt.text) continue;

      // Text comparison (case-insensitive, whitespace-normalized)
      const normalizedText = normalizeText(opt.text);
      if (seen.has(normalizedText)) {
        this.errors.push({
          file: relPath,
          question_id: q.question_id,
          severity: 'critical',
          type: 'duplicate_options',
          message: `Options ${seen.get(normalizedText)} and ${opt.id} have identical text: '${opt.text}'`,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          computed_answer: null
        });
      } else {
        seen.set(normalizedText, opt.id);
      }
    }

    // Numeric equivalence check: "0.5" vs "1/2" vs "50%"
    const numericValues = [];
    for (const opt of q.options) {
      if (!opt.text) continue;
      const val = parseNumericValue(opt.text);
      if (val !== null) {
        numericValues.push({ id: opt.id, value: val, text: opt.text });
      }
    }

    for (let i = 0; i < numericValues.length; i++) {
      for (let j = i + 1; j < numericValues.length; j++) {
        // Skip if same text (already caught above)
        if (normalizeText(numericValues[i].text) === normalizeText(numericValues[j].text)) continue;
        if (numbersAreEqualStrict(numericValues[i].value, numericValues[j].value)) {
          this.errors.push({
            file: relPath,
            question_id: q.question_id,
            severity: 'critical',
            type: 'duplicate_options',
            message: `Options ${numericValues[i].id} ('${numericValues[i].text}') and ${numericValues[j].id} ('${numericValues[j].text}') are numerically equivalent`,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            computed_answer: null
          });
        }
      }
    }
  }

  /**
   * Check explanation-answer consistency.
   */
  checkWrongExplanation(q, relPath) {
    const explErrors = this.explChecker.check(q);
    for (const err of explErrors) {
      this.errors.push({
        file: relPath,
        question_id: q.question_id,
        severity: err.severity,
        type: err.type,
        message: err.message,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        computed_answer: null
      });
    }
  }

  /**
   * Check for garbled text in all text fields.
   */
  checkGarbledText(q, relPath) {
    const fieldsToCheck = [
      { name: 'question_text', text: q.question_text },
      { name: 'explanation_correct', text: q.explanation_correct },
      { name: 'explanation_incorrect', text: q.explanation_incorrect },
    ];

    // Also check option texts
    if (q.options) {
      for (const opt of q.options) {
        fieldsToCheck.push({ name: `option_${opt.id}`, text: opt.text });
      }
    }

    for (const field of fieldsToCheck) {
      if (!field.text) continue;
      const issues = this.garbledDetector.check(field.text, field.name);
      for (const issue of issues) {
        this.errors.push({
          file: relPath,
          question_id: q.question_id,
          severity: issue.severity,
          type: issue.type,
          message: issue.message,
          question_text: q.question_text ? q.question_text.substring(0, 120) : null,
          correct_answer: q.correct_answer,
          computed_answer: null
        });
      }
    }
  }

  /**
   * Check file-level metadata.
   */
  checkMetadata(fileData, relPath) {
    // Check total_questions if present
    const totalQ = fileData.total_questions || (fileData.metadata && fileData.metadata.total_questions);
    const actualCount = (fileData.questions || []).length;
    if (totalQ !== undefined && totalQ !== null && totalQ !== actualCount) {
      this.errors.push({
        file: relPath,
        question_id: null,
        severity: 'low',
        type: 'metadata_mismatch',
        message: `total_questions says ${totalQ} but file has ${actualCount} questions`,
        question_text: null,
        correct_answer: null,
        computed_answer: null
      });
    }
  }

  /**
   * Check per-question metadata consistency.
   */
  checkQuestionMetadata(q, fileData, relPath) {
    // Check topic_id matches file
    if (q.question_id && fileData.topic_id) {
      const qTopicPrefix = q.question_id.substring(0, 6);
      if (qTopicPrefix !== fileData.topic_id && fileData.topic_id.length === 6) {
        this.errors.push({
          file: relPath,
          question_id: q.question_id,
          severity: 'low',
          type: 'metadata_mismatch',
          message: `Question topic prefix '${qTopicPrefix}' doesn't match file topic_id '${fileData.topic_id}'`,
          question_text: q.question_text ? q.question_text.substring(0, 80) : null,
          correct_answer: q.correct_answer,
          computed_answer: null
        });
      }
    }

    // Check class field consistency
    if (q.class !== undefined && fileData.cam_reference && fileData.cam_reference.class !== undefined) {
      if (q.class !== fileData.cam_reference.class) {
        this.errors.push({
          file: relPath,
          question_id: q.question_id,
          severity: 'low',
          type: 'metadata_mismatch',
          message: `Question class '${q.class}' doesn't match file class '${fileData.cam_reference.class}'`,
          question_text: null,
          correct_answer: null,
          computed_answer: null
        });
      }
    }
  }

  /**
   * Verify all JSON files in a directory.
   */
  verifyDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json')).sort();
    for (const file of files) {
      this.verifyFile(path.join(dirPath, file));
    }
  }

  /**
   * Run verification on given directories. Returns report object.
   */
  run(directories) {
    const startTime = Date.now();

    for (const dir of directories) {
      const dirPath = path.isAbsolute(dir) ? dir : path.join(QUESTIONS_DATA_DIR, dir);
      this.verifyDirectory(dirPath);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Build report
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    const byType = { wrong_answer: 0, duplicate_options: 0, wrong_explanation: 0, garbled_text: 0, metadata_mismatch: 0, parse_error: 0 };
    const byDirectory = {};

    for (const err of this.errors) {
      bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
      byType[err.type] = (byType[err.type] || 0) + 1;

      // Group by directory
      const dirName = err.file ? path.dirname(err.file) : 'unknown';
      if (!byDirectory[dirName]) {
        byDirectory[dirName] = {
          files_scanned: 0,
          total_questions: 0,
          errors: 0,
          by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
          by_type: { wrong_answer: 0, duplicate_options: 0, wrong_explanation: 0, garbled_text: 0, metadata_mismatch: 0 }
        };
      }
      byDirectory[dirName].errors++;
      byDirectory[dirName].by_severity[err.severity] = (byDirectory[dirName].by_severity[err.severity] || 0) + 1;
      byDirectory[dirName].by_type[err.type] = (byDirectory[dirName].by_type[err.type] || 0) + 1;
    }

    // Fill in file/question counts per directory from stats
    // We track this by scanning which directories we visited
    for (const dir of directories) {
      const dirPath = path.isAbsolute(dir) ? dir : path.join(QUESTIONS_DATA_DIR, dir);
      if (!fs.existsSync(dirPath)) continue;
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      const dirName = path.relative(QUESTIONS_DATA_DIR, dirPath);
      if (!byDirectory[dirName]) {
        byDirectory[dirName] = {
          files_scanned: 0,
          total_questions: 0,
          errors: 0,
          by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
          by_type: { wrong_answer: 0, duplicate_options: 0, wrong_explanation: 0, garbled_text: 0, metadata_mismatch: 0 }
        };
      }
      byDirectory[dirName].files_scanned = files.length;
      let qCount = 0;
      for (const f of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf8'));
          qCount += (data.questions || []).length;
        } catch { /* skip */ }
      }
      byDirectory[dirName].total_questions = qCount;
    }

    const report = {
      timestamp: new Date().toISOString(),
      elapsed_seconds: parseFloat(elapsed),
      summary: {
        total_files: this.stats.totalFiles,
        total_questions: this.stats.totalQuestions,
        total_errors: this.errors.length,
        by_severity: bySeverity,
        by_type: byType
      },
      by_directory: byDirectory,
      errors: this.errors
    };

    return report;
  }
}

// ============================================================================
// CLI — Argument parsing, output formatting, report generation
// ============================================================================

function resolveDirectories(args) {
  if (args.length === 0) {
    // Scan all subdirectories of questions/data/
    if (!fs.existsSync(QUESTIONS_DATA_DIR)) {
      console.error(`Error: questions/data/ directory not found at ${QUESTIONS_DATA_DIR}`);
      process.exit(1);
    }
    return fs.readdirSync(QUESTIONS_DATA_DIR)
      .filter(d => fs.statSync(path.join(QUESTIONS_DATA_DIR, d)).isDirectory())
      .sort();
  }

  const resolved = [];
  for (const arg of args) {
    // Check if it's a direct subdirectory name
    const asSubdir = path.join(QUESTIONS_DATA_DIR, arg);
    if (fs.existsSync(asSubdir) && fs.statSync(asSubdir).isDirectory()) {
      resolved.push(arg);
      continue;
    }

    // Check if it's an absolute path
    if (path.isAbsolute(arg) && fs.existsSync(arg)) {
      resolved.push(arg);
      continue;
    }

    // Check if it's a glob-like pattern (e.g., "cbse-class*")
    if (arg.includes('*')) {
      const pattern = new RegExp('^' + arg.replace(/\*/g, '.*') + '$');
      const allDirs = fs.readdirSync(QUESTIONS_DATA_DIR)
        .filter(d => fs.statSync(path.join(QUESTIONS_DATA_DIR, d)).isDirectory());
      const matching = allDirs.filter(d => pattern.test(d));
      if (matching.length > 0) {
        resolved.push(...matching);
        continue;
      }
    }

    // Partial match (e.g., "class7" matches "class7", "class7-biology", etc.)
    const allDirs = fs.readdirSync(QUESTIONS_DATA_DIR)
      .filter(d => fs.statSync(path.join(QUESTIONS_DATA_DIR, d)).isDirectory());
    const matching = allDirs.filter(d => d === arg || d.startsWith(arg + '-'));
    if (matching.length > 0) {
      resolved.push(...matching);
    } else {
      console.warn(`Warning: No matching directory found for '${arg}'`);
    }
  }

  return [...new Set(resolved)].sort();
}

function printReport(report) {
  const s = report.summary;

  console.log('');
  console.log('='.repeat(70));
  console.log('  CONTENT VERIFICATION REPORT');
  console.log('='.repeat(70));
  console.log('');
  console.log(`  Files scanned:    ${s.total_files}`);
  console.log(`  Questions checked: ${s.total_questions}`);
  console.log(`  Total errors:     ${s.total_errors}`);
  console.log(`  Time:             ${report.elapsed_seconds}s`);
  console.log('');

  console.log('  BY SEVERITY:');
  console.log(`    Critical: ${s.by_severity.critical}`);
  console.log(`    High:     ${s.by_severity.high}`);
  console.log(`    Medium:   ${s.by_severity.medium}`);
  console.log(`    Low:      ${s.by_severity.low}`);
  console.log('');

  console.log('  BY TYPE:');
  console.log(`    Wrong Answer:      ${s.by_type.wrong_answer}`);
  console.log(`    Duplicate Options: ${s.by_type.duplicate_options}`);
  console.log(`    Wrong Explanation: ${s.by_type.wrong_explanation}`);
  console.log(`    Garbled Text:      ${s.by_type.garbled_text}`);
  console.log(`    Metadata Mismatch: ${s.by_type.metadata_mismatch}`);
  if (s.by_type.parse_error) {
    console.log(`    Parse Error:       ${s.by_type.parse_error}`);
  }
  console.log('');

  // Per-directory breakdown
  const dirs = Object.entries(report.by_directory).sort((a, b) => a[0].localeCompare(b[0]));
  if (dirs.length > 0 && dirs.length <= 30) {
    console.log('  BY DIRECTORY:');
    console.log('  ' + '-'.repeat(68));
    console.log(`  ${'Directory'.padEnd(30)} ${'Files'.padStart(5)} ${'Questions'.padStart(9)} ${'Errors'.padStart(7)} ${'Crit'.padStart(5)} ${'High'.padStart(5)}`);
    console.log('  ' + '-'.repeat(68));
    for (const [dir, data] of dirs) {
      if (data.errors > 0 || data.files_scanned > 0) {
        console.log(`  ${dir.padEnd(30)} ${String(data.files_scanned).padStart(5)} ${String(data.total_questions).padStart(9)} ${String(data.errors).padStart(7)} ${String(data.by_severity.critical).padStart(5)} ${String(data.by_severity.high).padStart(5)}`);
      }
    }
    console.log('  ' + '-'.repeat(68));
    console.log('');
  } else if (dirs.length > 30) {
    // For large runs, only show dirs with errors
    const dirsWithErrors = dirs.filter(([, d]) => d.errors > 0);
    console.log(`  BY DIRECTORY (${dirsWithErrors.length} with errors out of ${dirs.length}):`);
    console.log('  ' + '-'.repeat(68));
    console.log(`  ${'Directory'.padEnd(30)} ${'Files'.padStart(5)} ${'Questions'.padStart(9)} ${'Errors'.padStart(7)} ${'Crit'.padStart(5)} ${'High'.padStart(5)}`);
    console.log('  ' + '-'.repeat(68));
    for (const [dir, data] of dirsWithErrors) {
      console.log(`  ${dir.padEnd(30)} ${String(data.files_scanned).padStart(5)} ${String(data.total_questions).padStart(9)} ${String(data.errors).padStart(7)} ${String(data.by_severity.critical).padStart(5)} ${String(data.by_severity.high).padStart(5)}`);
    }
    console.log('  ' + '-'.repeat(68));
    console.log('');
  }

  // Sample errors (first 20)
  if (report.errors.length > 0) {
    const criticalErrors = report.errors.filter(e => e.severity === 'critical');
    const highErrors = report.errors.filter(e => e.severity === 'high');
    const sample = [...criticalErrors.slice(0, 10), ...highErrors.slice(0, 10)];

    console.log(`  SAMPLE ERRORS (${sample.length} of ${report.errors.length}):`);
    console.log('  ' + '-'.repeat(68));
    for (const err of sample) {
      console.log(`  [${err.severity.toUpperCase()}] ${err.type} — ${err.file} — ${err.question_id || 'file-level'}`);
      console.log(`    ${err.message}`);
      if (err.question_text) {
        console.log(`    Q: "${err.question_text.substring(0, 80)}${err.question_text.length > 80 ? '...' : ''}"`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(70));
  if (s.total_errors === 0) {
    console.log('  No content errors detected.');
  } else {
    console.log(`  ${s.total_errors} content errors detected. Review report for details.`);
  }
  console.log('='.repeat(70));
  console.log('');
}

// ============================================================================
// Main
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const directories = resolveDirectories(args);

  if (directories.length === 0) {
    console.error('No directories to scan.');
    process.exit(1);
  }

  console.log(`Scanning ${directories.length} director${directories.length === 1 ? 'y' : 'ies'}...`);

  const verifier = new ContentVerifier();
  const report = verifier.run(directories);

  // Print to console
  printReport(report);

  // Write JSON report
  const reportPath = path.join(__dirname, 'content-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Full report written to: ${reportPath}`);
}

// Export for programmatic use
module.exports = { ContentVerifier, MathEvaluator, ExplanationChecker, GarbledTextDetector, parseNumericValue, numbersAreEqual };
