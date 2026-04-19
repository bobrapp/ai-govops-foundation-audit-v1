/**
 * @aigovops/verify — Reference verifier for the AiGovOps Open Standard (AOS).
 *
 * This package is intentionally small, dependency-free, and runtime-agnostic.
 * It exists so anyone — insurer, regulator, customer, journalist — can
 * independently verify an AOS attestation without trusting the issuing server.
 */
export { canonicalize } from "./canonical.js";
export { sha256Hex, hmacSha256Hex, toHex } from "./crypto.js";
export {
  GENESIS,
  signPayload,
  verifyChain,
  type AuditEntry,
  type ChainResult,
  type EntryResult,
} from "./chain.js";
export { verifyPdf, type PdfVerifyResult } from "./pdf.js";
export {
  fetchFeed,
  activeOnly,
  expiringWithinDays,
  type FeedAttestation,
  type FeedResponse,
  type FetchFeedOptions,
  type RiskTier,
  type CertStatus,
} from "./feed.js";
export {
  verifyReview,
  type ReviewVerifyResult,
  type VerifyReviewOptions,
  type ServerCertification,
  type ServerVerifyResponse,
} from "./verify-review.js";
