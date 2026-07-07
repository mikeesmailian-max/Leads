import type { ReplyCategoryGuess } from "./classify";

export type SentimentTier = "HOT" | "WARM" | "NEUTRAL" | "COLD";

const HOT_CATEGORIES: ReplyCategoryGuess[] = ["INTERESTED", "QUOTE_REQUEST"];
const WARM_CATEGORIES: ReplyCategoryGuess[] = ["SEND_RATES", "SEND_CAPACITY", "LATER"];
const COLD_CATEGORIES: ReplyCategoryGuess[] = ["NOT_INTERESTED", "UNSUBSCRIBE", "OUT_OF_OFFICE", "WRONG_CONTACT"];

/** Cheap, deterministic sentiment tier from the already-computed category — no extra API call. */
export function sentimentTierFromCategory(category: ReplyCategoryGuess): SentimentTier {
  if (HOT_CATEGORIES.includes(category)) return "HOT";
  if (WARM_CATEGORIES.includes(category)) return "WARM";
  if (COLD_CATEGORIES.includes(category)) return "COLD";
  return "NEUTRAL";
}

export interface LlmClassification {
  category: ReplyCategoryGuess;
  sentiment: SentimentTier;
}

const VALID_CATEGORIES: ReplyCategoryGuess[] = [
  "INTERESTED", "NOT_INTERESTED", "WRONG_CONTACT", "SEND_RATES", "SEND_CAPACITY",
  "QUOTE_REQUEST", "LATER", "UNSUBSCRIBE", "OUT_OF_OFFICE", "UNKNOWN",
];
const VALID_TIERS: SentimentTier[] = ["HOT", "WARM", "NEUTRAL", "COLD"];

/**
 * Reply sentiment auto-triage upgrade path (recommendation #7). The
 * keyword-based heuristic in classify.ts handles the common, clearly-worded
 * cases for free. For replies it can't confidently categorize (UNKNOWN),
 * this optionally calls an LLM to read the actual reply and produce a
 * category + sentiment tier — gated behind ANTHROPIC_API_KEY so the app
 * degrades gracefully (stays on the heuristic-only path) when unconfigured.
 */
export async function classifyReplyWithLLM(text: string): Promise<LlmClassification | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Classify this freight-brokerage sales reply. Reply with ONLY a JSON object like {"category":"INTERESTED","sentiment":"HOT"} and nothing else.\n\nValid categories: ${VALID_CATEGORIES.join(", ")}\nValid sentiments: ${VALID_TIERS.join(", ")}\n\nReply text:\n"""${text.slice(0, 2000)}"""`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic classification failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? "";
    const match = raw.match(/\{[^}]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);

    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "UNKNOWN";
    const sentiment = VALID_TIERS.includes(parsed.sentiment) ? parsed.sentiment : "NEUTRAL";
    return { category, sentiment };
  } catch (err) {
    console.error("LLM reply classification error:", err);
    return null;
  }
}
