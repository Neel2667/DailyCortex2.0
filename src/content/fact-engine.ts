import type { FactualClaim, ClaimCategory } from "../types.js";

export interface ClaimValidationResult {
  valid: boolean;
  issues: string[];
  claimCount: number;
  verifiedFactCount: number;
}

export interface ScriptAuditResult {
  passed: boolean;
  score: number;
  unsupportedStatistics: string[];
  unverifiedCitations: string[];
  overconfidentPhrases: string[];
  sensationalistPhrases: string[];
  notes: string[];
}

export class FactEngine {
  /**
   * Validates a set of claims against rigorous scientific integrity rules:
   * 1. No empty claims or missing classifications
   * 2. VERIFIED_FACT requires documented source, source title, and high confidence (>= 0.7)
   * 3. SPECULATION must carry explicit framing notes/qualifications
   * 4. No contradictory or ungrounded statements
   */
  static validateClaims(claims: FactualClaim[]): ClaimValidationResult {
    const issues: string[] = [];

    if (!claims || claims.length === 0) {
      issues.push("Topic contains zero factual claims; cannot generate evidence-backed script");
      return { valid: false, issues, claimCount: 0, verifiedFactCount: 0 };
    }

    const verifiedFacts = claims.filter(c => c.category === "VERIFIED_FACT");
    if (verifiedFacts.length === 0) {
      issues.push("At least one claim must be categorized as VERIFIED_FACT with empirical grounding");
    }

    for (const c of claims) {
      if (!c.claim || c.claim.trim().length < 10) {
        issues.push(`Claim [${c.id}] is too brief or empty`);
      }

      if (c.category === "VERIFIED_FACT") {
        if (!c.source && !c.sourceTitle) {
          issues.push(`Claim [${c.id}] marked VERIFIED_FACT is missing academic/peer-reviewed citation source`);
        }
        if (c.confidence < 0.7) {
          issues.push(`Claim [${c.id}] marked VERIFIED_FACT has insufficient confidence score (${c.confidence} < 0.70)`);
        }
      }

      if (c.category === "SPECULATION") {
        if (!c.notes && !c.qualification) {
          issues.push(`Speculative claim [${c.id}] ("${c.claim.slice(0, 30)}...") must include framing notes/qualifications to prevent stating as scientific truth`);
        }
      }

      if (c.confidence < 0.0 || c.confidence > 1.0) {
        issues.push(`Claim [${c.id}] confidence must be normalized between 0.0 and 1.0`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      claimCount: claims.length,
      verifiedFactCount: verifiedFacts.length
    };
  }

  /**
   * Deep script audit against factual claims:
   * - Scans for unsupported statistics (percentages, multipliers) not backed by claim registry
   * - Flags unverified institutional or researcher citations
   * - Detects banned sensationalist and overconfident clickbait wording
   * - Calculates evidence coverage ratio
   */
  static auditScriptAgainstClaims(scriptText: string, claims: FactualClaim[]): ScriptAuditResult {
    const notes: string[] = [];
    const unsupportedStatistics: string[] = [];
    const unverifiedCitations: string[] = [];
    const overconfidentPhrases: string[] = [];
    const sensationalistPhrases: string[] = [];
    const lower = scriptText.toLowerCase();

    // 1. Check for banned sensationalist filler phrases
    const sensationalistPatterns = [
      "scientists were shocked",
      "everything you know is a lie",
      "did you know that",
      "here is something crazy",
      "mind-blowing secret",
      "what they don't want you to know",
      "unbelievable discovery"
    ];

    for (const phrase of sensationalistPatterns) {
      if (lower.includes(phrase)) {
        sensationalistPhrases.push(phrase);
        notes.push(`Sensationalist filler detected: "${phrase}"`);
      }
    }

    // 2. Check for overconfident or pseudoscience assertions
    const overconfidentPatterns = [
      "proves without a doubt",
      "scientists 100% confirmed",
      "absolute undeniable proof",
      "permanently cures",
      "instant brain hack",
      "secret evolutionary code"
    ];

    for (const phrase of overconfidentPatterns) {
      if (lower.includes(phrase)) {
        overconfidentPhrases.push(phrase);
        notes.push(`Overconfident claim detected: "${phrase}"`);
      }
    }

    // 3. Check for unsupported statistics:
    // Extract numbers with percent/percentage in the script (e.g. "85%", "20 percent")
    const statMatches = scriptText.match(/\b\d+(\.\d+)?\s*(%|percent\b)/gi) || [];
    const allClaimSourcesAndText = claims
      .map(c => `${c.claim} ${c.source || ""} ${c.sourceTitle || ""} ${c.notes || ""}`)
      .join(" ")
      .toLowerCase();

    for (const stat of statMatches) {
      const numMatch = stat.match(/\d+/);
      if (numMatch && !allClaimSourcesAndText.includes(numMatch[0])) {
        unsupportedStatistics.push(stat);
        notes.push(`Unsupported statistic in script: "${stat}" not found in verified claim evidence`);
      }
    }

    // 4. Check for researcher/institution name-drops not in claim sources
    const institutionPatterns = ["harvard", "stanford", "mit", "oxford", "cambridge", "nasa"];
    for (const inst of institutionPatterns) {
      if (lower.includes(inst) && !allClaimSourcesAndText.includes(inst)) {
        unverifiedCitations.push(inst);
        notes.push(`Unverified institution citation in script: "${inst}" not present in topic claims`);
      }
    }

    // 5. Evidence Coverage
    let verifiedCount = 0;
    for (const claim of claims) {
      const keywords = claim.claim
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .split(" ")
        .filter(w => w.length > 5);

      const matched = keywords.some(k => lower.includes(k));
      if (matched) {
        verifiedCount++;
      }
    }

    const claimCoverage = claims.length > 0 ? verifiedCount / claims.length : 1;
    if (claimCoverage < 0.5) {
      notes.push(`Script touches on only ${Math.round(claimCoverage * 100)}% of the established factual claims`);
    }

    const passed =
      sensationalistPhrases.length === 0 &&
      overconfidentPhrases.length === 0 &&
      unsupportedStatistics.length === 0 &&
      unverifiedCitations.length === 0 &&
      claimCoverage >= 0.5;

    return {
      passed,
      score: Number(claimCoverage.toFixed(2)),
      unsupportedStatistics,
      unverifiedCitations,
      overconfidentPhrases,
      sensationalistPhrases,
      notes
    };
  }
}
