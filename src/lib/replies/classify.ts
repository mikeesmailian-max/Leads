export type ReplyCategoryGuess =
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "WRONG_CONTACT"
  | "SEND_RATES"
  | "SEND_CAPACITY"
  | "QUOTE_REQUEST"
  | "LATER"
  | "UNSUBSCRIBE"
  | "OUT_OF_OFFICE"
  | "UNKNOWN";

const RULES: { category: ReplyCategoryGuess; patterns: RegExp[] }[] = [
  { category: "OUT_OF_OFFICE", patterns: [/out of (the )?office/i, /on vacation/i, /auto[- ]?reply/i, /currently unavailable/i] },
  { category: "UNSUBSCRIBE", patterns: [/unsubscribe/i, /remove me from/i, /stop (emailing|contacting)/i, /do not contact/i] },
  { category: "WRONG_CONTACT", patterns: [/wrong person/i, /not the right (person|contact)/i, /reach out to/i, /please contact/i, /no longer (with|works? at)/i] },
  { category: "QUOTE_REQUEST", patterns: [/send (me |us )?(a )?quote/i, /what('s| is) your rate/i, /pricing for/i, /how much (would|does|to)/i] },
  { category: "SEND_RATES", patterns: [/send (over )?(your )?rates?/i, /rate sheet/i] },
  { category: "SEND_CAPACITY", patterns: [/capacity (this|next) week/i, /available trucks?/i, /what capacity/i] },
  { category: "INTERESTED", patterns: [/interested/i, /let'?s talk/i, /sounds good/i, /tell me more/i, /schedule a call/i, /works for me/i] },
  { category: "NOT_INTERESTED", patterns: [/not interested/i, /no thanks/i, /we'?re (all )?set/i, /already have/i, /not looking/i] },
  { category: "LATER", patterns: [/check back/i, /follow up (in|next)/i, /not (right )?now/i, /maybe later/i, /reach out (again|later)/i] },
];

export function suggestReplyCategory(text: string): ReplyCategoryGuess {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category;
  }
  return "UNKNOWN";
}

export const NEXT_ACTION_BY_CATEGORY: Record<ReplyCategoryGuess, string> = {
  INTERESTED: "Call the account and move the opportunity to Quoting.",
  NOT_INTERESTED: "Mark opportunity Lost with reason, archive follow-ups.",
  WRONG_CONTACT: "Research a better contact at this account.",
  SEND_RATES: "Prepare and send a rate quote for the discussed lane.",
  SEND_CAPACITY: "Confirm available capacity and reply with details.",
  QUOTE_REQUEST: "Draft a quote-response outreach and send within 24 hours.",
  LATER: "Schedule a re-engagement follow-up for the requested timeframe.",
  UNSUBSCRIBE: "Mark contact do-not-contact and stop all sequences.",
  OUT_OF_OFFICE: "Re-send the original outreach after their return date.",
  UNKNOWN: "Review manually and choose a category.",
};
