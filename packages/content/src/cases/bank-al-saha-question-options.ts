import type { BankContentQuestion, BankPlayerCount, BankQuestionSet } from "./bank-al-saha.v1";

type BankContentOption = BankContentQuestion["options"][number];

const semanticFactKey = (key: string): string => {
  if (key.includes("location:saud") || key.includes("observed-location:saud")) return "saud_location";
  if (key.includes("bag")) return "bag_holder";
  if (key.includes("key") || key.includes("reflective-tag") || key.includes("carry")) return "key_holder";
  if (key.includes("route")) return "route";
  if (key.includes("doorway-figure") || key.includes("arrival-person") || key.includes("crossing-person")) return "doorway_person";
  if (key.includes("door-witness") || key.includes("door-stay")) return "door_witness";
  if (key.includes("saud-moved") || key.includes("saud_stayed") || key.includes("saud_departure")) return "saud_movement";
  if (key.includes("parking_camera_sightline")) return "parking_sightline";
  return key;
};

const CANONICAL_FACTS: Record<BankQuestionSet, Readonly<Record<string, readonly string[]>>> = {
  first: {
    saud_location: ["parking"], key_holder: ["saud"], bag_holder: ["fahad"],
    door_witness: ["nawaf"], doorway_person: ["saud"], person: ["saud"], parking_sightline: ["saud"],
  },
  movement: {
    route: ["sidewalk"], doorway_person: ["saud"], bag_holder: ["fahad"],
    key_holder: ["key_only"], door_witness: ["nawaf"], person: ["saud"],
    saud_movement: ["saud", "yes"],
  },
  identity: {
    route: ["no_parking_movement"], doorway_person: ["nawaf"], bag_holder: ["fahad"],
    key_holder: ["saud"], door_witness: ["yes"], person: ["saud"], saud_movement: ["no"],
    "doorway-marker": ["jacket", "key_tag"],
  },
};

export const bankOptionSemanticFacts = (option: BankContentOption): Record<string, string> =>
  Object.fromEntries(Object.entries(option.normalizedFacts).map(([key, value]) => [semanticFactKey(key), value]));

function causalLane(set: BankQuestionSet, option: BankContentOption): "coherent" | "mixed" | "conflicting" {
  const known = Object.entries(bankOptionSemanticFacts(option)).filter(([key]) => CANONICAL_FACTS[set][key]);
  if (known.length === 0) return "mixed";
  const matches = known.filter(([key, value]) => CANONICAL_FACTS[set][key]!.includes(value)).length;
  return matches === known.length ? "coherent" : matches === 0 ? "conflicting" : "mixed";
}

export function areBankLinkedOptionsCompatible(
  set: BankQuestionSet,
  owner: BankContentOption,
  target: BankContentOption,
): boolean {
  const ownerFacts = bankOptionSemanticFacts(owner);
  const targetFacts = bankOptionSemanticFacts(target);
  const shared = Object.keys(ownerFacts).filter((key) => Object.hasOwn(targetFacts, key));
  if (shared.length > 0) return shared.every((key) => ownerFacts[key] === targetFacts[key]);
  const ownerLane = causalLane(set, owner);
  const targetLane = causalLane(set, target);
  return ownerLane === targetLane || (ownerLane === "mixed" && targetLane === "coherent");
}

export function isBankCanonicalLinkedOption(set: BankQuestionSet, option: BankContentOption): boolean {
  return causalLane(set, option) === "coherent";
}

const option = (
  id: string,
  ar: string,
  normalizedFacts: Record<string, string>,
): BankContentQuestion["options"][number] => ({ id, label: { ar }, normalizedFacts });

export const question = (
  count: BankPlayerCount,
  set: BankQuestionSet,
  seat: number,
  ar: string,
  factKeys: string[],
  comparisonRefs: string[],
  options: BankContentQuestion["options"],
): BankContentQuestion => ({
  id: `bank.${count}.${set}.seat-${seat}`,
  seatKey: `seat-${seat}`,
  set,
  prompt: { ar },
  options,
  factKeys,
  comparisonRefs,
  checks:
    set === "first"
      ? {
          storyRef: `story.${factKeys[0]}`,
          firstLinkedRef: comparisonRefs.find((ref) => ref.startsWith("linked.")),
        }
      : {
          repairRef: `repair.${set}`,
          evidenceRef: comparisonRefs[0],
          finalLinkedRef: comparisonRefs.find((ref) => ref.startsWith("linked.")),
        },
});

export const firstOptions = {
  saudLocation: [
    option("parking", "عند السيارة", { "location:saud:11:42": "parking" }),
    option("cafe", "داخل المقهى", { "location:saud:11:42": "cafe" }),
    option("station", "عند محطة البنزين", { "location:saud:11:42": "petrol_station" }),
  ],
  bag: [
    option("with-fahad", "مع فهد في المحطة", { "bag:11:42": "fahad" }),
    option("in-car", "داخل السيارة", { "bag:11:42": "car" }),
    option("with-saud", "مع سعود", { "bag:11:42": "saud" }),
  ],
  key: [
    option("with-saud", "مع سعود", { "key:11:42": "saud" }),
    option("with-rakan", "مع راكان", { "key:11:42": "rakan" }),
    option("with-nawaf", "مع نواف", { "key:11:42": "nawaf" }),
  ],
  doorway: [
    option("nawaf", "نواف", { "door-witness:11:42": "nawaf" }),
    option("saud", "سعود", { "door-witness:11:42": "saud" }),
    option("yazid", "يزيد", { "door-witness:11:42": "yazid" }),
  ],
};

export const movementOptions = {
  route: [
    option("sidewalk", "ممشى المواقف", { "route:saud": "sidewalk" }),
    option("alley", "الزقاق", { "route:saud": "alley" }),
    option("back-street", "الشارع الخلفي", { "route:saud": "back_street" }),
  ],
  entrant: [
    option("saud", "سعود", { "doorway-figure:11:44": "saud" }),
    option("nawaf", "نواف", { "doorway-figure:11:44": "nawaf" }),
    option("rakan", "راكان", { "doorway-figure:11:44": "rakan" }),
  ],
  carried: [
    option("key-only", "المفتاح فقط", { "saud-carry:11:44": "key_only" }),
    option("bag", "الشنطة", { "saud-carry:11:44": "bag" }),
    option("nothing", "ولا شيء", { "saud-carry:11:44": "nothing" }),
  ],
  bag: [
    option("with-fahad", "بقيت مع فهد", { "bag:11:44": "fahad" }),
    option("with-saud", "تحركت مع سعود", { "bag:11:44": "saud" }),
    option("in-car", "بقيت في السيارة", { "bag:11:44": "car" }),
  ],
  doorWait: [
    option("nawaf", "نواف", { "door-witness:11:44": "nawaf" }),
    option("yazid", "يزيد", { "door-witness:11:44": "yazid" }),
    option("none", "محد", { "door-witness:11:44": "none" }),
  ],
};

export const peopleOptions = [
  option("saud", "سعود", { person: "saud" }),
  option("yazid", "يزيد", { person: "yazid" }),
  option("fahad", "فهد", { person: "fahad" }),
  option("rakan", "راكان", { person: "rakan" }),
  option("nawaf", "نواف", { person: "nawaf" }),
  option("joud", "جود", { person: "joud" }),
];

export const peopleOptionsFor = (factKey: string): BankContentQuestion["options"] =>
  peopleOptions.map((entry) => ({
    ...entry,
    normalizedFacts: { [factKey]: entry.id },
  }));

// The six-player bag exchange is person-to-person on both sides of its link.
// Giving both questions the same complete semantic domain guarantees that every
// authored answer has a genuine matching and mismatching counterpart.
export const bagHolderOptions = peopleOptionsFor("bag:11:42");

export const saudOpeningOptions = [
  option("parking-key", "عند السيارة والمفتاح معي", {
    "location:saud:11:42": "parking",
    "key:11:42": "saud",
  }),
  option("cafe-key", "داخل المقهى والمفتاح معي", {
    "location:saud:11:42": "cafe",
    "key:11:42": "saud",
  }),
  option("parking-no-key", "عند السيارة والمفتاح مع غيري", {
    "location:saud:11:42": "parking",
    "key:11:42": "other",
  }),
  option("station-no-key", "ظ…ط­ط·ط© ط§ظ„ط¨ظ†ط²ظٹظ† ظˆط§ظ„ظ…ظپطھط§ط­ ظ…ط¹ ط؛ظٹط±ظٹ", {
    "location:saud:11:42": "petrol_station",
    "key:11:42": "other",
  }),
];

export const identityOptions = {
  stayed: [
    option("stayed", "بقيت عند السيارة", { "saud-moved-before:11:44": "no" }),
    option("left", "تركت السيارة", { "saud-moved-before:11:44": "yes" }),
  ],
  marker: [
    option("jacket", "تفاصيل الجاكيت", { "doorway-marker": "jacket" }),
    option("key-tag", "لمعة علاقة المفتاح", { "doorway-marker": "key_tag" }),
  ],
  keyOwner: [
    option("saud", "سعود فقط", { "reflective-tag-owner": "saud" }),
    option("nawaf", "نواف", { "reflective-tag-owner": "nawaf" }),
    option("unknown", "ما قدرت أحدد", { "reflective-tag-owner": "unknown" }),
  ],
  route: [
    option("no-movement", "ما جاء من المواقف", { "doorway-route": "no_parking_movement" }),
    option("sidewalk", "جاء من ممشى المواقف", { "doorway-route": "sidewalk" }),
    option("alley", "جاء من الزقاق", { "doorway-route": "alley" }),
  ],
  doorStay: [
    option("stayed", "بقيت عند الباب", { "nawaf-door-stay": "yes" }),
    option("arrived", "جيت من المواقف", { "nawaf-door-stay": "no" }),
  ],
};
