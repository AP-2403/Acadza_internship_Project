import React from 'react';

/**
 * Parses radicals like sqrt(...) and root(...) using balanced parentheses
 * so nested expressions like sqrt(V_R^2 + (V_L - V_C)^2) are fully matched.
 */
function parseRadicals(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    let prefix = '';
    if (text.substring(i, i + 5) === 'sqrt(') {
      prefix = 'sqrt(';
    } else if (text.substring(i, i + 5) === 'root(') {
      prefix = 'root(';
    }

    if (prefix) {
      let depth = 1;
      const start = i + prefix.length;
      let j = start;

      while (j < text.length && depth > 0) {
        if (text[j] === '(') depth++;
        else if (text[j] === ')') depth--;
        j++;
      }

      if (depth === 0) {
        const inner = text.substring(start, j - 1);
        const formattedInner = formatMathString(inner);
        result += `<span class="inline-flex items-center font-serif math-sqrt mx-1 align-baseline"><span class="text-base font-bold text-slate-800 leading-none select-none">√</span><span class="border-t-2 border-slate-700 px-1 font-mono text-[0.95em] bg-slate-50/60 rounded-t-xs">${formattedInner}</span></span>`;
        i = j;
        continue;
      }
    }

    result += text[i];
    i++;
  }

  return result;
}

/**
 * Formats LaTeX \frac{num}{den} into standard visual stacked fractions.
 */
function parseFractions(text: string): string {
  let res = text;
  // LaTeX \frac{numerator}{denominator}
  res = res.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_m, num, den) => {
    return `<span class="inline-flex flex-col items-center align-middle mx-1 text-xs"><span class="border-b border-slate-600 px-1 leading-tight text-center">${formatMathString(num)}</span><span class="px-1 leading-tight text-center">${formatMathString(den)}</span></span>`;
  });
  return res;
}

/**
 * Transforms plain text mathematical expressions (subscripts, superscripts,
 * square roots, Greek letters, arrows, symbols) into publication-quality HTML typography.
 */
export function formatMathString(text: string): string {
  if (!text) return '';

  let res = text;

  // 1. Logic, Arrows & Equality
  res = res.replace(/=>|==>/g, ' ⇒ ');
  res = res.replace(/->|-->/g, ' → ');
  res = res.replace(/<=/g, ' ≤ ');
  res = res.replace(/>=/g, ' ≥ ');
  res = res.replace(/!=/g, ' ≠ ');
  res = res.replace(/\+\/-/g, ' ± ');
  res = res.replace(/\bapprox\b/g, ' ≈ ');

  // 2. Greek letters & Constants
  res = res.replace(/\\mu\b|\bmu\b(?=[^\w]|$)/g, 'μ');
  res = res.replace(/\\lambda\b|\blambda\b/g, 'λ');
  res = res.replace(/\\pi\b|\bpi\b(?=[^\w]|$)/g, 'π');
  res = res.replace(/\\theta\b|\btheta\b/g, 'θ');
  res = res.replace(/\\phi\b|\bphi\b/g, 'φ');
  res = res.replace(/\\alpha\b|\balpha\b/g, 'α');
  res = res.replace(/\\beta\b|\bbeta\b/g, 'β');
  res = res.replace(/\\gamma\b|\bgamma\b/g, 'γ');
  res = res.replace(/\\Delta\b|\bDelta\b/g, 'Δ');
  res = res.replace(/\\Omega\b|\bOmega\b/g, 'Ω');
  res = res.replace(/\\sigma\b|\bsigma\b/g, 'σ');
  res = res.replace(/\\tau\b|\btau\b/g, 'τ');
  res = res.replace(/\\omega\b|\bomega\b/g, 'ω');
  res = res.replace(/\\epsilon\b|\bepsilon\b/g, 'ε');

  // 3. LaTeX Fractions
  res = parseFractions(res);

  // 4. Square roots and Radicals (balanced parenthesis parsing)
  res = parseRadicals(res);

  // 5. Common Superscripts: ^2, ^3, ^4, ^0, ^1, ^-1, ^(-1), ^n
  res = res.replace(/\^2\b/g, '²');
  res = res.replace(/\^3\b/g, '³');
  res = res.replace(/\^4\b/g, '⁴');
  res = res.replace(/\^0\b/g, '⁰');
  res = res.replace(/\^1\b/g, '¹');
  res = res.replace(/\^\(-1\)/g, '⁻¹');
  res = res.replace(/\^-1\b/g, '⁻¹');
  res = res.replace(/\^([a-zA-Z0-9+\-]+)/g, '<sup class="text-[0.7em] font-bold text-slate-800">$1</sup>');

  // 6. Subscripts: V_R -> V<sub class="math-sub">R</sub>, q_1 -> q<sub class="math-sub">1</sub>
  res = res.replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1<sub class="text-[0.72em] font-semibold text-slate-700 tracking-tight">$2</sub>');
  res = res.replace(/([A-Za-z])_\(([^)]+)\)/g, '$1<sub class="text-[0.72em] font-semibold text-slate-700 tracking-tight">$2</sub>');

  // 7. Multiplication between numbers: e.g. " 10 * 10 " -> " 10 × 10 "
  res = res.replace(/(\d+)\s*\*\s*(\d+)/g, '$1 × $2');

  return res;
}

/**
 * Clean & normalize raw MathML/HTML from question bank:
 * - Removes awkward outer <h3> tags that distort vertical margins.
 * - Converts raw HTML entities (&epsilon;, &lambda;, &rsquo;, etc.) into stable unicode.
 * - Normalizes <mspace linebreak="newline"> into clean breaks.
 * - Strips dark inline color hacks so typography respects clean light mode.
 */
export function cleanQuestionHtml(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // 1. Remove redundant outer <h3> wrappers that cause huge vertical margins
  cleaned = cleaned.replace(/^<h3>|<\/h3>$/gi, '');

  // 2. Fix unclosed <mspace linebreak="newline"> tags
  cleaned = cleaned.replace(/<mspace[^>]*>/gi, '<br />');

  // 3. Normalize named HTML entities into robust Unicode for flawless rendering
  cleaned = cleaned.replace(/&epsilon;/gi, 'ε');
  cleaned = cleaned.replace(/&lambda;/gi, 'λ');
  cleaned = cleaned.replace(/&rsquo;/gi, '’');
  cleaned = cleaned.replace(/&lsquo;/gi, '‘');
  cleaned = cleaned.replace(/&rdquo;/gi, '”');
  cleaned = cleaned.replace(/&ldquo;/gi, '“');
  cleaned = cleaned.replace(/&deg;/gi, '°');
  cleaned = cleaned.replace(/&plusmn;/gi, '±');
  cleaned = cleaned.replace(/&times;/gi, '×');
  cleaned = cleaned.replace(/&divide;/gi, '÷');
  cleaned = cleaned.replace(/&phi;/gi, 'φ');
  cleaned = cleaned.replace(/&theta;/gi, 'θ');
  cleaned = cleaned.replace(/&alpha;/gi, 'α');
  cleaned = cleaned.replace(/&beta;/gi, 'β');
  cleaned = cleaned.replace(/&gamma;/gi, 'γ');
  cleaned = cleaned.replace(/&omega;/gi, 'ω');
  cleaned = cleaned.replace(/&Omega;/gi, 'Ω');
  cleaned = cleaned.replace(/&mu;/gi, 'μ');

  // 4. Remove ugly hardcoded inline font styles that ruin light mode
  cleaned = cleaned.replace(/style="[^"]*color:\s*#000000[^"]*"/gi, '');
  cleaned = cleaned.replace(/style="[^"]*font-size:[^"]*"/gi, '');

  return cleaned;
}

interface FormattedMathTextProps {
  text: string;
  className?: string;
}

export const FormattedMathText: React.FC<FormattedMathTextProps> = ({ text, className = '' }) => {
  const formattedHtml = formatMathString(text);
  return (
    <span
      className={`math-rendered-text ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
};

interface FormattedHtmlMathProps {
  html: string;
  className?: string;
}

export const FormattedHtmlMath: React.FC<FormattedHtmlMathProps> = ({ html, className = '' }) => {
  const cleaned = cleanQuestionHtml(html);
  return (
    <div
      className={`question-rendered-body leading-relaxed text-slate-900 ${className}`}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
};
