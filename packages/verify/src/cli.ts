#!/usr/bin/env node
/**
 * aigovops-verify — minimal CLI wrapper around the public verify endpoints.
 *
 * Usage:
 *   aigovops-verify review --host https://aigovops.example.com --review-id <uuid>
 *   aigovops-verify feed   --host https://aigovops.example.com [--risk-tier high] [--since 2025-01-01]
 *   aigovops-verify pdf    --url <pdf-url> --sha256 <hex>
 *
 * Exit codes:
 *   0  ok
 *   1  verification failed
 *   2  usage / network error
 */
import { fetchFeed } from "./feed.js";
import { verifyPdf } from "./pdf.js";
import { verifyReview } from "./verify-review.js";

function getArg(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  try {
    if (cmd === "review") {
      const host = getArg(rest, "host");
      const reviewId = getArg(rest, "review-id");
      if (!host || !reviewId) throw new Error("--host and --review-id required");
      const result = await verifyReview({ host, reviewId, signingKey: process.env.AOS_SIGNING_KEY });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }
    if (cmd === "feed") {
      const host = getArg(rest, "host");
      if (!host) throw new Error("--host required");
      const feed = await fetchFeed({
        host,
        risk_tier: getArg(rest, "risk-tier") as "medium" | "high" | "critical" | undefined,
        since: getArg(rest, "since"),
      });
      console.log(JSON.stringify(feed, null, 2));
      process.exit(0);
    }
    if (cmd === "pdf") {
      const url = getArg(rest, "url");
      const sha = getArg(rest, "sha256");
      if (!url || !sha) throw new Error("--url and --sha256 required");
      const r = await verifyPdf(url, sha);
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.ok ? 0 : 1);
    }
    console.error("Usage: aigovops-verify <review|feed|pdf> [...flags]");
    process.exit(2);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
}

main();
