import React from 'react';

/**
 * Transforms plain text mathematical expressions (subscripts, superscripts,
 * square roots, Greek letters, arrows) into beautiful HTML typography.
 */
export function formatMathString(text: string): string {
  if (!text) return '';

  let res = text;

  // 1. Arrows & Equality
  res = res.replace(/=>|==>/g, '⇒');
  res = res.replace(/->|-->/g, '→');
  res = res.replace(/<=/g, '≤');
  res = res.replace(/>=/g, '≥');
  res = res.replace(/!=/g, '≠');
  res = res.replace(/\+\/-/g, '±');

  // 2. Greek letters
  res = res.replace(/\\mu\b|\bmu\b(?=[^\w]|$)/g, 'μ');
  res = res.replace(/\\lambda\b|\blambda\b/g, 'λ');
  res = res.replace(/\\pi\b|\bpi\b(?=[^\w]|$)/g, 'π');
  res = res.replace(/\\theta\b|\btheta\b/g, 'θ');
  res = res.replace(/\\phi\b|\bphi\b/g, 'φ');
  res = res.replace(/\\alpha\b|\balpha\b/g, 'α');
  res = res.replace(/\\beta\b|\bbeta\b/g, 'β');
  res = res.replace(/\\Delta\b|\bDelta\b/g, 'Δ');
  res = res.replace(/\\Omega\b|\bOmega\b/g, 'Ω');
  res = res.replace(/\\sigma\b|\bsigma\b/g, 'σ');

  // 3. Square roots: sqrt(...) -> √(...) with styled radical
  // Match sqrt(content) where content has balanced or nested parens
  res = res.replace(/sqrt\(([^)]+(?:\([^)]*\)[^)]*)*)\)/g, (_match, inner) => {
    // recursively format inner
    const formattedInner = formatMathString(inner);
    return `<span class="inline-flex items-center font-serif math-sqrt mx-0.5"><span class="text-sm font-bold text-slate-800 leading-none">√</span><span class="border-t-2 border-slate-700 px-1 font-mono text-[0.95em]">${formattedInner}</span></span>`;
  });

  // 4. Superscripts: ^2, ^3, ^4, ^(-1), ^n
  res = res.replace(/\^2\b/g, '²');
  res = res.replace(/\^3\b/g, '³');
  res = res.replace(/\^4\b/g, '⁴');
  res = res.replace(/\^0\b/g, '⁰');
  res = res.replace(/\^1\b/g, '¹');
  res = res.replace(/\^\(-1\)/g, '⁻¹');
  res = res.replace(/\^-1\b/g, '⁻¹');
  res = res.replace(/\^([a-zA-Z0-9+\-]+)/g, '<sup class="text-[0.7em] font-bold text-slate-800">$1</sup>');

  // 5. Subscripts: V_R -> V<sub class="math-sub">R</sub>, q_1 -> q<sub class="math-sub">1</sub>
  // Only replace when single variable or parens
  res = res.replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1<sub class="text-[0.72em] font-semibold text-slate-700 tracking-tight">$2</sub>');
  res = res.replace(/([A-Za-z])_\(([^)]+)\)/g, '$1<sub class="text-[0.72em] font-semibold text-slate-700 tracking-tight">$2</sub>');

  // 6. Multiplication between numbers: e.g. " 10 * 10 " -> " 10 × 10 "
  res = res.replace(/(\d+)\s*\*\s*(\d+)/g, '$1 × $2');

  return res;
}

/**
 * Clean & normalize raw MathML/HTML from question bank
 * Removes awkward outer <h3>, fixes <mspace>, styles MathML
 */
export function cleanQuestionHtml(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // Remove redundant outer <h3> wrappers that cause huge vertical margins
  cleaned = cleaned.replace(/^<h3>|<\/h3>$/gi, '');

  // Fix unclosed <mspace linebreak="newline"> tags
  cleaned = cleaned.replace(/<mspace[^>]*>/gi, '<br />');

  // Remove ugly hardcoded inline font styles that ruin light mode
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
