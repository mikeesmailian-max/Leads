import type { OutreachFacts, SenderProfile } from "./facts";

export type Style =
  | "COLD_INTRO"
  | "LANE_SPECIFIC"
  | "SIMILAR_FREIGHT"
  | "CAPACITY_SERVICE"
  | "FOLLOW_UP_NO_RESPONSE"
  | "WRONG_CONTACT_REROUTE"
  | "QUOTE_RESPONSE"
  | "RE_ENGAGEMENT";

export type Length = "SHORT" | "LONG";

function greetingName(facts: OutreachFacts): string {
  return facts.contactFirstName ? facts.contactFirstName : "there";
}

function signOff(profile: SenderProfile): string {
  return `\n\n${profile.signatureBlock}`;
}

function laneClause(facts: OutreachFacts): string | null {
  if (!facts.laneLabel) return null;
  const freq =
    facts.laneFrequencyCount && facts.laneFrequencyCount > 1
      ? ` — we've seen it come up ${facts.laneFrequencyCount} times in freight paperwork crossing our desk`
      : "";
  return `We noticed activity on the ${facts.laneLabel} lane${freq}.`;
}

function equipmentClause(facts: OutreachFacts, profile: SenderProfile): string {
  const equip =
    facts.laneEquipment === "REEFER"
      ? "reefer"
      : facts.laneEquipment === "DRY_VAN"
        ? "dry van"
        : facts.equipmentFocus === "REEFER"
          ? "reefer"
          : facts.equipmentFocus === "DRY_VAN"
            ? "dry van"
            : profile.equipmentLanguage;
  return `We run ${equip} capacity across ${profile.regionalSpecialization}`;
}

function subjectFor(style: Style, facts: OutreachFacts): string {
  switch (style) {
    case "LANE_SPECIFIC":
      return facts.laneLabel ? `${facts.laneLabel} coverage` : `Freight coverage for ${facts.accountName}`;
    case "SIMILAR_FREIGHT":
      return `Freight moving through ${facts.accountName}`;
    case "CAPACITY_SERVICE":
      return `${facts.equipmentFocus === "REEFER" ? "Reefer" : "Dry van"} capacity — ${facts.accountName}`;
    case "FOLLOW_UP_NO_RESPONSE":
      return `Following up — ${facts.accountName}`;
    case "WRONG_CONTACT_REROUTE":
      return `Quick redirect — freight contact at ${facts.accountName}`;
    case "QUOTE_RESPONSE":
      return `Rate/capacity for ${facts.laneLabel ?? facts.accountName}`;
    case "RE_ENGAGEMENT":
      return `Checking back in — ${facts.accountName}`;
    case "COLD_INTRO":
    default:
      return `Freight capacity for ${facts.accountName}`;
  }
}

function bodyFor(style: Style, length: Length, facts: OutreachFacts, profile: SenderProfile): string {
  const greeting = `Hi ${greetingName(facts)},`;
  const titleNote = facts.contactTitle ? ` I came across your role (${facts.contactTitle}) at ${facts.accountName}` : ` I came across ${facts.accountName}`;
  const long = length === "LONG";

  let opening: string;
  switch (style) {
    case "LANE_SPECIFIC": {
      const lane = laneClause(facts);
      opening = lane
        ? `${lane} ${equipmentClause(facts, profile)}, and wanted to introduce ${profile.companyName}.`
        : `${equipmentClause(facts, profile)}, and wanted to introduce ${profile.companyName}.`;
      break;
    }
    case "SIMILAR_FREIGHT":
      opening = `${titleNote} while reviewing freight movement in the region — looks like you may handle ${facts.equipmentFocus === "REEFER" ? "temperature-controlled" : "dry van"} freight, which is exactly the type of lane we support.`;
      break;
    case "CAPACITY_SERVICE":
      opening = `${equipmentClause(facts, profile)} and wanted to make sure ${facts.accountName} has a reliable option when your regular capacity is tight.`;
      break;
    case "FOLLOW_UP_NO_RESPONSE":
      opening = `Wanted to bump this back up in case it got buried — still happy to help with ${facts.laneLabel ? `the ${facts.laneLabel} lane` : "any freight you're moving"}.`;
      break;
    case "WRONG_CONTACT_REROUTE":
      opening = `Thanks for pointing me in the right direction — could you let me know who handles carrier/broker relationships for transportation at ${facts.accountName}, or loop them in here?`;
      break;
    case "QUOTE_RESPONSE":
      opening = `Appreciate you sending details over. Here's what we can put together${facts.laneLabel ? ` for ${facts.laneLabel}` : ""} — let me know if the numbers work or if you need adjustments.`;
      break;
    case "RE_ENGAGEMENT":
      opening = `It's been a while since we last connected — wanted to check if ${facts.accountName} still has freight moving on lanes we could help cover.`;
      break;
    case "COLD_INTRO":
    default:
      opening = `${titleNote} while reviewing freight movement in the region.`;
      break;
  }

  const middleShort = `${profile.companyName} covers ${profile.equipmentLanguage} freight across ${profile.regionalSpecialization}. If you've got a lane worth comparing notes on, I'd like to send over a quote.`;
  const middleLong = `${profile.companyName} is a freight brokerage focused on ${profile.equipmentLanguage} freight across ${profile.regionalSpecialization}. We work directly with a vetted carrier base, so we can usually turn around a quote same day and stay in close contact through pickup and delivery. If there's a lane worth comparing notes on, I'd like the chance to earn a shot at it.`;

  const closingQuestion =
    style === "WRONG_CONTACT_REROUTE"
      ? "Appreciate the help."
      : style === "QUOTE_RESPONSE"
        ? "Happy to adjust based on your timeline or volume."
        : "Worth a quick call or reply to compare notes?";

  const parts = [greeting, "", opening];
  if (style !== "WRONG_CONTACT_REROUTE") {
    parts.push("", long ? middleLong : middleShort);
  }
  parts.push("", closingQuestion);
  return parts.join("\n") + signOff(profile);
}

export function buildDraft(style: Style, length: Length, facts: OutreachFacts, profile: SenderProfile) {
  return {
    subject: subjectFor(style, facts),
    body: bodyFor(style, length, facts, profile),
  };
}

export const ALL_STYLES: Style[] = [
  "COLD_INTRO",
  "LANE_SPECIFIC",
  "SIMILAR_FREIGHT",
  "CAPACITY_SERVICE",
  "FOLLOW_UP_NO_RESPONSE",
  "WRONG_CONTACT_REROUTE",
  "QUOTE_RESPONSE",
  "RE_ENGAGEMENT",
];

export const STYLE_LABELS: Record<Style, string> = {
  COLD_INTRO: "Cold Intro",
  LANE_SPECIFIC: "Lane-Specific Intro",
  SIMILAR_FREIGHT: "“We Already Move Similar Freight”",
  CAPACITY_SERVICE: "Capacity / Service Intro",
  FOLLOW_UP_NO_RESPONSE: "Follow-Up After No Response",
  WRONG_CONTACT_REROUTE: "Wrong-Contact Reroute",
  QUOTE_RESPONSE: "Quote-Request Response",
  RE_ENGAGEMENT: "Re-Engagement",
};
