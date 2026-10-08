import type { FactualClaim, ClaimCategory } from "../types.js";

export class FactEngine {
  /**
   * Validates a set of claims against content integrity rules:
   * - No fabricated sources
   * - Speculation must not masquerade as fact
   * - Minimum confidence threshold for core claims
   */
  static validateClaims(claims: FactualClaim[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!claims || claims.length === 0) {
      issues.push("Topic contains zero factual claims; cannot generate evidence-backed script");
      return { valid: false, issues };
    }

    const verifiedFacts = claims.filter(c => c.category === "VERIFIED_FACT");
    if (verifiedFacts.length === 0) {
      issues.push("At least one claim must be categorized as VERIFIED_FACT");
    }

    for (const c of claims) {
      if (c.confidence < 0.6 && c.category === "VERIFIED_FACT") {
        issues.push(`Claim "${c.claim.slice(0, 30)}..." marked VERIFIED_FACT has low confidence (${c.confidence})`);
      }
      if (c.category === "SPECULATION" && !c.notes) {
        issues.push(`Speculative claim "${c.claim.slice(0, 30)}..." must include framing notes to prevent stating as scientific truth`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Asserts whether a script text appropriately represents the claims without unverified exaggerations
   */
  static auditScriptAgainstClaims(scriptText: string, claims: FactualClaim[]): { passed: boolean; score: number; notes: string[] } {
    const notes: string[] = [];
    const lower = scriptText.toLowerCase();

    // Check for banned cliched exaggerations
    const bannedPhrases = [
      "scientists were shocked",
      "everything you know is a lie",
      "did you know that",
      "here is something crazy"
    ];

    for (const phrase of bannedPhrases) {
      if (lower.includes(phrase)) {
        notes.push(`Script contains sensationalist filler phrase: "${phrase}"`);
      }
    }

    // Verify key concepts from claims appear in the script
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

    const passed = notes.length === 0;
    return {
      passed,
      score: claimCoverage,
      notes
    };
  }
}
