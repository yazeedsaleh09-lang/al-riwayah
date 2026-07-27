/**
 * First playable case: `missing_payroll_envelope_v1`.
 *
 * A payroll envelope disappears from an office between 23:30 and 00:00 while the
 * group is the last set of people inside. All copy is Arabic-first, Saudi
 * conversational (COPY_DECK.md). Logic keys are stable ASCII ids; no Arabic text
 * is ever used as a logic key (CONTENT_SYSTEM.md).
 */
import type {
  ContradictionRule,
  DetectedContradiction,
  DetectionContext,
  GameCase,
  PatchDefinition,
  PlausibilityRule,
  Question,
} from "@al-riwayah/game-engine";

const ar = (ar: string, en?: string) => (en ? { ar, en } : { ar });

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

const locations = [
  { id: "meeting_room", label: ar("غرفة الاجتماعات") },
  { id: "reception", label: ar("الاستقبال") },
  { id: "storage", label: ar("المستودع") },
  { id: "parking", label: ar("المواقف") },
];

const reasons = [
  { id: "urgent_work", label: ar("شغل عاجل"), plausibility: 0 },
  { id: "personal_item", label: ar("نجيب غرض شخصي"), plausibility: -1 },
  { id: "repair_equipment", label: ar("نصلّح جهاز"), plausibility: 1 },
  { id: "informal_meeting", label: ar("جلسة ودّية"), plausibility: -1 },
];

const roles = [
  { id: "driver", label: ar("السائق") },
  { id: "security_caller", label: ar("اللي اتصل بالحارس") },
  { id: "key_holder", label: ar("ماسك المفتاح") },
  { id: "first_to_leave", label: ar("أول من طلع") },
];

// ---------------------------------------------------------------------------
// Answer-option helpers
// ---------------------------------------------------------------------------

const yesNo = [
  { id: "opt.yes", label: ar("نعم"), normalized: "yes" },
  { id: "opt.no", label: ar("لا"), normalized: "no" },
  { id: "opt.dont_remember", label: ar("ما أذكر"), normalized: "unknown", evasive: true },
];

const locationOptions = locations.map((l) => ({
  id: `opt.loc.${l.id}`,
  label: l.label,
  normalized: l.id,
}));

const reasonOptions = reasons.map((r) => ({
  id: `opt.reason.${r.id}`,
  label: r.label,
  normalized: r.id,
}));

const timeIntervalOptions = [
  { id: "opt.time.before_2346", label: ar("قبل ١١:٤٦"), normalized: "before_2346" },
  { id: "opt.time.2346_2355", label: ar("بين ١١:٤٦ و ١١:٥٥"), normalized: "2346_2355" },
  { id: "opt.time.after_2355", label: ar("بعد ١١:٥٥"), normalized: "after_2355" },
  { id: "opt.time.unsure", label: ar("مو متأكد"), normalized: "unknown", evasive: true },
];

// ---------------------------------------------------------------------------
// Questions (>= spec minimums across families)
// ---------------------------------------------------------------------------

const questions: Question[] = [
  // Foundation (8)
  {
    id: "q.foundation.location_2346",
    family: "foundation",
    tag: "loc2346",
    prompt: ar("وين كنت بالضبط وقت انقطعت الكهرباء؟"),
    options: locationOptions,
  },
  {
    id: "q.foundation.driver",
    family: "foundation",
    tag: "driver",
    prompt: ar("مين كان يسوق السيارة؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.foundation.reason",
    family: "foundation",
    tag: "reason",
    prompt: ar("ليش كنتم بالشركة هالوقت؟"),
    options: reasonOptions,
  },
  {
    id: "q.foundation.security_caller",
    family: "foundation",
    tag: "security_caller",
    prompt: ar("مين اتصل بالحارس؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.foundation.key_holder",
    family: "foundation",
    tag: "key_holder",
    prompt: ar("مين كان ماسك مفتاح المستودع؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.foundation.first_leave",
    family: "foundation",
    tag: "first_leave",
    prompt: ar("مين أول واحد طلع من غرفة الاجتماعات؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.foundation.lights_reaction",
    family: "foundation",
    tag: "lights_reaction",
    prompt: ar("أول ما انطفت الأنوار، وش سويت؟"),
    options: [
      { id: "opt.lr.stayed", label: ar("قعدت مكاني"), normalized: "stayed" },
      { id: "opt.lr.moved", label: ar("تحركت أدوّر جوالي"), normalized: "moved" },
      { id: "opt.lr.left", label: ar("طلعت برّا"), normalized: "left" },
    ],
  },
  {
    id: "q.foundation.envelope_last_seen",
    family: "foundation",
    tag: "envelope_last_seen",
    prompt: ar("وين آخر مرة شفت فيها ظرف الرواتب؟"),
    options: locationOptions,
  },

  // Gaps (12)
  {
    id: "q.gaps.with_player",
    family: "witness",
    tag: "with_player",
    prompt: ar("مين كان معك وقت الانقطاع؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.gaps.was_alone",
    family: "gaps",
    tag: "was_alone",
    prompt: ar("كنت لحالك وقت الانقطاع؟"),
    options: [
      { id: "opt.alone.yes", label: ar("إي، لحالي"), normalized: "alone" },
      { id: "opt.alone.no", label: ar("لا، كان معي أحد"), normalized: "with_someone" },
    ],
  },
  {
    id: "q.gaps.storage_visit",
    family: "gaps",
    tag: "storage_visit",
    prompt: ar("دخلت المستودع في أي لحظة؟"),
    options: yesNo,
  },
  {
    id: "q.gaps.saw_vehicle",
    family: "gaps",
    tag: "saw_vehicle",
    prompt: ar("شفت أحد يطلع بالسيارة؟"),
    options: yesNo,
  },
  {
    id: "q.gaps.phone_light",
    family: "gaps",
    tag: "phone_light",
    prompt: ar("استخدمت جوالك كإضاءة؟"),
    options: yesNo,
  },
  {
    id: "q.gaps.heard_call",
    family: "gaps",
    tag: "heard_call",
    prompt: ar("سمعت أحد يكلّم الحارس؟"),
    options: yesNo,
  },
  {
    id: "q.gaps.touched_envelope",
    family: "gaps",
    tag: "touched_envelope",
    prompt: ar("لمست ظرف الرواتب اليوم؟"),
    options: yesNo,
  },
  {
    id: "q.gaps.door_locked",
    family: "gaps",
    tag: "door_locked",
    prompt: ar("باب المستودع كان مقفل ولا مفتوح؟"),
    options: [
      { id: "opt.door.locked", label: ar("مقفل"), normalized: "locked" },
      { id: "opt.door.open", label: ar("مفتوح"), normalized: "open" },
      { id: "opt.door.unknown", label: ar("ما انتبهت"), normalized: "unknown", evasive: true },
    ],
  },
  {
    id: "q.gaps.moved_in_dark",
    family: "gaps",
    tag: "moved_in_dark",
    prompt: ar("تحركت من مكانك وقت الظلام؟"),
    options: yesNo,
  },
  {
    id: "q.timeline.leave_time",
    family: "timeline",
    tag: "leave_time",
    prompt: ar("متى طلعت من المبنى؟"),
    options: timeIntervalOptions,
  },
  {
    id: "q.timeline.blackout_duration",
    family: "timeline",
    tag: "blackout_duration",
    prompt: ar("كم قعدت الكهرباء مقطوعة تقريبًا؟"),
    options: [
      { id: "opt.dur.short", label: ar("دقايق بسيطة"), normalized: "short" },
      { id: "opt.dur.long", label: ar("ربع ساعة أو أكثر"), normalized: "long" },
      { id: "opt.dur.unsure", label: ar("ما حسبتها"), normalized: "unknown", evasive: true },
    ],
  },
  {
    id: "q.location.after_blackout",
    family: "location",
    tag: "loc_after",
    prompt: ar("بعد ما رجعت الكهرباء، وين رحت؟"),
    options: locationOptions,
  },
  {
    id: "q.location.parked_where",
    family: "location",
    tag: "parked_where",
    prompt: ar("سيارتكم كانت واقفة وين؟"),
    options: [
      { id: "opt.park.front", label: ar("الموقف الأمامي"), normalized: "front" },
      { id: "opt.park.back", label: ar("الموقف الخلفي"), normalized: "back" },
      { id: "opt.park.street", label: ar("الشارع"), normalized: "street" },
    ],
  },

  // No-good-answer (8)
  {
    id: "q.nogo.key_last_held",
    family: "no_good_answer",
    tag: "key_last_held",
    prompt: ar("مين آخر واحد كان ماسك المفتاح قبل الانقطاع؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.nogo.storage_reason",
    family: "no_good_answer",
    tag: "storage_reason",
    prompt: ar("لو أحد دخل المستودع، وش السبب الأقرب؟"),
    options: [
      { id: "opt.sr.charger", label: ar("يجيب شاحن"), normalized: "charger" },
      { id: "opt.sr.documents", label: ar("يجيب أوراق"), normalized: "documents" },
      { id: "opt.sr.nobody", label: ar("محد دخل أصلًا"), normalized: "nobody" },
    ],
  },
  {
    id: "q.nogo.who_suspicious",
    family: "no_good_answer",
    tag: "who_suspicious",
    prompt: ar("مين تصرّفه كان أغرب شي بالليلة؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.nogo.envelope_fault",
    family: "no_good_answer",
    tag: "envelope_fault",
    prompt: ar("لو ضاع الظرف، خطأ مين الأقرب؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.nogo.cover_or_truth",
    family: "no_good_answer",
    tag: "cover_or_truth",
    prompt: ar("لو الحارس سألك سؤال محرج، وش تختار؟"),
    options: [
      { id: "opt.ct.protect", label: ar("أحمي الشلة"), normalized: "protect" },
      { id: "opt.ct.self", label: ar("أحمي نفسي"), normalized: "self" },
      { id: "opt.ct.silent", label: ar("أسكت"), normalized: "silent", evasive: true },
    ],
  },
  {
    id: "q.nogo.money_location",
    family: "no_good_answer",
    tag: "money_location",
    prompt: ar("لو الفلوس طلعت مع أحد، وين تتوقعها الحين؟"),
    options: [
      { id: "opt.ml.car", label: ar("بالسيارة"), normalized: "car" },
      { id: "opt.ml.storage", label: ar("بالمستودع"), normalized: "storage" },
      { id: "opt.ml.bag", label: ar("بحقيبة أحدهم"), normalized: "bag" },
    ],
  },
  {
    id: "q.nogo.trust_least",
    family: "no_good_answer",
    tag: "trust_least",
    prompt: ar("مين أقل واحد تثق في روايته الحين؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.nogo.sacrifice_fact",
    family: "no_good_answer",
    tag: "sacrifice_fact",
    prompt: ar("أي تفصيلة مستعد تتنازل عنها عشان تنقذ الباقي؟"),
    options: [
      { id: "opt.sf.driver", label: ar("مين كان يسوق"), normalized: "driver" },
      { id: "opt.sf.location", label: ar("مكاني وقت الانقطاع"), normalized: "location" },
      { id: "opt.sf.storage", label: ar("موضوع المستودع"), normalized: "storage" },
    ],
  },

  // Witness (6 total incl. with_player above → add 5 more)
  {
    id: "q.witness.confirm_driver",
    family: "witness",
    tag: "confirm_driver",
    prompt: ar("مين تقدر يشهد إنه شافك برّا المستودع؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.witness.who_saw_you_leave",
    family: "witness",
    tag: "who_saw_you_leave",
    prompt: ar("مين شافك وأنت تطلع؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.witness.who_with_key",
    family: "witness",
    tag: "who_with_key",
    prompt: ar("مين كان جنبك وقت أخذت المفتاح؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.witness.who_called_security",
    family: "witness",
    tag: "who_called_security_w",
    prompt: ar("مين سمعك تتصل بالحارس؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "q.witness.who_in_car",
    family: "witness",
    tag: "who_in_car",
    prompt: ar("مين كان معك بالسيارة وقت الطلعة؟"),
    dynamicOptions: "other_players",
  },

  // Follow-ups (referenced by patches)
  {
    id: "followup.why_left_storage",
    family: "followup",
    tag: "why_left_storage",
    prompt: ar("طيب ليش طلعت من المستودع بالضبط؟"),
    options: [
      { id: "opt.wls.call", label: ar("جاني اتصال"), normalized: "call" },
      { id: "opt.wls.forgot", label: ar("نسيت شي بالسيارة"), normalized: "forgot" },
      { id: "opt.wls.scared", label: ar("انخوفت من الظلمة"), normalized: "scared" },
    ],
  },
  {
    id: "followup.who_requested_parking_trip",
    family: "followup",
    tag: "who_requested_parking_trip",
    prompt: ar("مين طلب منك تروح المواقف؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "followup.returned_before_wifi_event",
    family: "followup",
    tag: "returned_before_wifi_event",
    prompt: ar("رجعت المستودع قبل ١١:٤٨؟"),
    options: yesNo,
  },
  {
    id: "followup.charger_owner",
    family: "followup",
    tag: "charger_owner",
    prompt: ar("الشاحن اللي جبته كان لمين؟"),
    dynamicOptions: "other_players",
  },
  {
    id: "followup.return_time",
    family: "followup",
    tag: "return_time",
    prompt: ar("متى رجعت للمجموعة بعد المستودع؟"),
    options: timeIntervalOptions,
  },
  {
    id: "followup.identity_confusion",
    family: "followup",
    tag: "identity_confusion",
    prompt: ar("مع مين تلخبطت بالظلمة؟"),
    dynamicOptions: "other_players",
  },
];

// ---------------------------------------------------------------------------
// Contradiction rules (deterministic predicates)
// ---------------------------------------------------------------------------

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

const contradictionRules: ContradictionRule[] = [
  // 1. EVIDENCE_COLLISION — the Wi-Fi/storage device holder denies the storage visit.
  {
    id: "contradiction.evidence.storage_wifi.v1",
    category: "EVIDENCE_COLLISION",
    severity: 20,
    narrativeImportance: 10,
    detect(ctx: DetectionContext): DetectedContradiction[] {
      const hasWifiEvidence = ctx.evidenceFacts.some((f) => f.tag === "wifi_storage");
      if (!hasWifiEvidence) return [];
      const out: DetectedContradiction[] = [];
      for (const player of ctx.players) {
        const facts = ctx.privateEvidenceFacts(player.id);
        const holdsDevice = facts.some(
          (f) => f.tag === "holder_storage_presence" && f.value === "yes",
        );
        if (!holdsDevice) continue;
        const ans = ctx.getAnswer(player.id, "storage_visit");
        if (ans && ans.normalized === "no") {
          out.push({
            ruleId: "contradiction.evidence.storage_wifi.v1",
            category: "EVIDENCE_COLLISION",
            severity: 20,
            narrativeImportance: 10,
            involvedPlayers: [player.id],
            params: { A: player.id },
            playerParams: ["A"],
            statementA: ar("{{A}}: ما دخلت المستودع."),
            statementB: ar("الدليل: جهاز {{A}} اتصل بشبكة المستودع الساعة ١١:٤٨."),
            rule: ar("إنكار الزيارة ما يركب مع اتصال الجهاز من نطاق المستودع."),
            explanation: ar(
              "{{A}} قال إنه ما دخل المستودع، لكن جهازه اتصل بشبكة المستودع الساعة ١١:٤٨.",
            ),
          });
        }
      }
      return out;
    },
  },

  // 2. DIRECT_IMPOSSIBILITY — two players name different drivers.
  {
    id: "contradiction.direct.two_drivers.v1",
    category: "DIRECT_IMPOSSIBILITY",
    severity: 16,
    narrativeImportance: 8,
    detect(ctx): DetectedContradiction[] {
      const answers = ctx
        .answersByTag("driver")
        .slice()
        .sort((a, b) => a.playerId.localeCompare(b.playerId));
      for (let i = 0; i < answers.length; i++) {
        for (let j = i + 1; j < answers.length; j++) {
          const a = answers[i]!;
          const b = answers[j]!;
          if (a.normalized !== "unknown" && b.normalized !== "unknown" && a.normalized !== b.normalized) {
            const [p1, p2] = pair(a.playerId, b.playerId);
            return [
              {
                ruleId: "contradiction.direct.two_drivers.v1",
                category: "DIRECT_IMPOSSIBILITY",
                severity: 16,
                narrativeImportance: 8,
                involvedPlayers: [p1, p2],
                params: {
                  A: p1,
                  B: p2,
                  driver1: ctx.playerName(a.normalized),
                  driver2: ctx.playerName(b.normalized),
                },
                playerParams: ["A", "B"],
                statementA: ar("{{A}}: {{driver1}} كان يسوق."),
                statementB: ar("{{B}}: {{driver2}} كان يسوق."),
                rule: ar("السيارة لها سائق واحد في نفس الرحلة، والاسمان مختلفان."),
                explanation: ar(
                  "{{A}} قال إن {{driver1}} كان يسوق، و{{B}} قال إن {{driver2}} كان يسوق — ما يمكن الاثنين صح.",
                ),
              },
            ];
          }
        }
      }
      return [];
    },
  },

  // 3. WITNESS_DENIAL — A says "with B", B says alone (or names someone else).
  {
    id: "contradiction.witness.denied.v1",
    category: "WITNESS_DENIAL",
    severity: 15,
    narrativeImportance: 9,
    detect(ctx): DetectedContradiction[] {
      const out: DetectedContradiction[] = [];
      for (const a of ctx.answersByTag("with_player")) {
        const target = a.normalized;
        if (!target || target === "unknown") continue;
        const targetAlone = ctx.getAnswer(target, "was_alone");
        const targetWith = ctx.getAnswer(target, "with_player");
        const denies =
          (targetAlone && targetAlone.normalized === "alone") ||
          (targetWith && targetWith.normalized !== a.playerId && targetWith.normalized !== "unknown");
        if (denies) {
          const [p1, p2] = pair(a.playerId, target);
          out.push({
            ruleId: "contradiction.witness.denied.v1",
            category: "WITNESS_DENIAL",
            severity: 15,
            narrativeImportance: 9,
            involvedPlayers: [p1, p2],
            params: { A: a.playerId, B: target },
            playerParams: ["A", "B"],
            statementA: ar("{{A}}: كنت مع {{B}} وقت الانقطاع."),
            statementB: ar("{{B}}: شهادتي ما تؤكد كلام {{A}}."),
            rule: ar("الشاهد المذكور لازم يؤكد وجوده مع صاحب الشهادة في نفس اللحظة."),
            explanation: ar("{{A}} قال إنه كان مع {{B}}، بس {{B}} يقول غير كذا."),
          });
        }
      }
      return out;
    },
  },

  // 4. LOCKED_FACT_BREAK — interrogation location differs from the locked plan.
  {
    id: "contradiction.locked.location_break.v1",
    category: "LOCKED_FACT_BREAK",
    severity: 12,
    narrativeImportance: 6,
    detect(ctx): DetectedContradiction[] {
      const out: DetectedContradiction[] = [];
      for (const player of ctx.players) {
        const locked = ctx.sharedStory[`location.${player.id}`];
        if (!locked) continue;
        const ans = ctx.getAnswer(player.id, "loc2346");
        if (ans && ans.normalized !== "unknown" && ans.normalized !== locked) {
          out.push({
            ruleId: "contradiction.locked.location_break.v1",
            category: "LOCKED_FACT_BREAK",
            severity: 12,
            narrativeImportance: 6,
            involvedPlayers: [player.id],
            params: { A: player.id },
            playerParams: ["A"],
            statementA: ar("{{A}} ثبّت مكانه ضمن الرواية قبل التحقيق."),
            statementB: ar("{{A}} أعطى مكانًا مختلفًا أثناء التحقيق."),
            rule: ar("المكان المثبّت ما يتغيّر بعد قفل الرواية."),
            explanation: ar("{{A}} غيّر مكانه عن الرواية المتفق عليها وقت الانقطاع."),
          });
        }
      }
      return out;
    },
  },

  // 5. COLOCATION — A claims to be with B, but their locked locations differ.
  {
    id: "contradiction.colocation.mismatch.v1",
    category: "COLOCATION",
    severity: 11,
    narrativeImportance: 5,
    detect(ctx): DetectedContradiction[] {
      const out: DetectedContradiction[] = [];
      for (const a of ctx.answersByTag("with_player")) {
        const target = a.normalized;
        if (!target || target === "unknown") continue;
        const locA = ctx.sharedStory[`location.${a.playerId}`];
        const locB = ctx.sharedStory[`location.${target}`];
        if (locA && locB && locA !== locB) {
          const [p1, p2] = pair(a.playerId, target);
          out.push({
            ruleId: "contradiction.colocation.mismatch.v1",
            category: "COLOCATION",
            severity: 11,
            narrativeImportance: 5,
            involvedPlayers: [p1, p2],
            params: { A: a.playerId, B: target },
            playerParams: ["A", "B"],
            statementA: ar("{{A}}: كنت مع {{B}} وقت الانقطاع."),
            statementB: ar("المكانان المثبّتان لـ{{A}} و{{B}} مختلفان."),
            rule: ar("ما يقدر شخصان يكونان معًا في اللحظة نفسها ومكاناهما المثبّتان مختلفان."),
            explanation: ar("{{A}} قال إنه كان مع {{B}}، بس كل واحد مكانه المتفق عليه مختلف."),
          });
        }
      }
      return out;
    },
  },

  // 6b. Follow-up breaks a patch commitment (ENG-007). A patch that promised the
  // player returned before 23:48 is broken when they later say they did not.
  {
    id: "contradiction.followup.commitment_break.v1",
    category: "DIRECT_IMPOSSIBILITY",
    severity: 14,
    narrativeImportance: 7,
    detect(ctx): DetectedContradiction[] {
      const out: DetectedContradiction[] = [];
      for (const c of ctx.commitments) {
        if (!c.playerId) continue;
        if (
          (c.factKey === "storage.return_time" && c.value === "before_2348") ||
          c.factKey === "transition.window"
        ) {
          const a = ctx.getAnswer(c.playerId, "returned_before_wifi_event");
          if (a && a.normalized === "no") {
            out.push({
              ruleId: "contradiction.followup.commitment_break.v1",
              category: "DIRECT_IMPOSSIBILITY",
              severity: 14,
              narrativeImportance: 7,
              involvedPlayers: [c.playerId],
              params: { A: c.playerId },
              playerParams: ["A"],
              statementA: ar("الترقيعة ألزمت {{A}} بالرجوع قبل ١١:٤٨."),
              statementB: ar("{{A}}: ما رجعت قبل ١١:٤٨."),
              rule: ar("الإجابة الجديدة خالفت التزامًا صار جزءًا من الرواية."),
              explanation: ar("{{A}} خالف التزام الترقيعة: قال إنه ما رجع قبل ١١:٤٨."),
            });
          }
        }
      }
      return out;
    },
  },

  // 6. MAJORITY_ANOMALY — one player's reason differs from everyone else's.
  {
    id: "contradiction.majority.reason_anomaly.v1",
    category: "MAJORITY_ANOMALY",
    severity: 8,
    narrativeImportance: 3,
    detect(ctx): DetectedContradiction[] {
      const answers = ctx.answersByTag("reason").filter((a) => a.normalized !== "unknown");
      if (answers.length < 3) return [];
      const counts = new Map<string, number>();
      for (const a of answers) counts.set(a.normalized, (counts.get(a.normalized) ?? 0) + 1);
      const majorityValue = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]!;
      if (majorityValue[1] < answers.length - 1) return [];
      const odd = answers.find((a) => a.normalized !== majorityValue[0]);
      if (!odd) return [];
      return [
        {
          ruleId: "contradiction.majority.reason_anomaly.v1",
          category: "MAJORITY_ANOMALY",
          severity: 8,
          narrativeImportance: 3,
          involvedPlayers: [odd.playerId],
          params: { A: odd.playerId },
          playerParams: ["A"],
          statementA: ar("{{A}} أعطى سببًا مختلفًا لدخول الشركة."),
          statementB: ar("باقي الشلة اتفقت على سبب واحد."),
          rule: ar("هذا اختلاف عن أغلبية الرواية؛ علامة اشتباه، مو استحالة قاطعة."),
          explanation: ar("{{A}} عطى سبب مختلف عن سبب باقي الشلة."),
        },
      ];
    },
  },
];

// ---------------------------------------------------------------------------
// Plausibility rules
// ---------------------------------------------------------------------------

const plausibilityRules: PlausibilityRule[] = [
  {
    id: "plausibility.everyone_moved",
    delta: -6,
    reason: ar("كل الشلة قالوا إنهم تحركوا وقت الظلام — رواية صعب تصدّق."),
    applies(ctx): boolean {
      const answers = ctx.answersByTag("lights_reaction");
      if (answers.length < 3) return false;
      return answers.every((a) => a.normalized !== "stayed");
    },
  },
  {
    id: "plausibility.distributed_roles",
    delta: 4,
    reason: ar("الأدوار موزّعة بشكل منطقي بين اللاعبين."),
    applies(ctx): boolean {
      const driver = ctx.sharedStory["role.driver"];
      const caller = ctx.sharedStory["role.security_caller"];
      const key = ctx.sharedStory["role.key_holder"];
      return Boolean(driver && caller && key && driver !== caller && caller !== key);
    },
  },
  {
    id: "plausibility.storage_without_motive",
    delta: -5,
    reason: ar("أحد دخل المستودع بدون سبب واضح."),
    applies(ctx): boolean {
      const admitted = ctx.answersByTag("storage_visit").some((a) => a.normalized === "yes");
      const hasMotive =
        ctx.commitments.length > 0 ||
        ctx.answersByTag("storage_reason").some((a) => a.normalized !== "nobody");
      return admitted && !hasMotive;
    },
  },
  {
    id: "plausibility.coherent_repair_reason",
    delta: 3,
    reason: ar("سبب الدخول (تصليح جهاز) يخدم الرواية."),
    applies(ctx): boolean {
      return ctx.sharedStory["reason"] === "repair_equipment";
    },
  },
];

// ---------------------------------------------------------------------------
// Patches
// ---------------------------------------------------------------------------

const patches: PatchDefinition[] = [
  {
    id: "patch.left_storage_before_outage.v1",
    archetype: "shift_time",
    resolvesCategories: ["COLOCATION", "WITNESS_DENIAL"],
    publicLabel: ar("كان معه قبلها، ثم طلع للمواقف"),
    description: ar("نثبّت إنه كان بالمستودع قبل الانقطاع بشوي، وبعدها راح للمواقف."),
    commitments: [
      {
        factKey: "transition.window",
        value: "23:40-23:46",
        fromContradiction: "primaryPlayer",
        label: ar("{{player}} كان بالمستودع ثم طلع بين ١١:٤٠ و ١١:٤٦"),
      },
    ],
    scoreEffects: { plausibility: -3, stability: -5 },
    followUpQuestionIds: [
      "followup.why_left_storage",
      "followup.who_requested_parking_trip",
      "followup.returned_before_wifi_event",
    ],
  },
  {
    id: "patch.mistaken_identity.v1",
    archetype: "mistaken_identity",
    resolvesCategories: ["DIRECT_IMPOSSIBILITY", "WITNESS_DENIAL"],
    publicLabel: ar("التبس عليه الشخص بالظلمة"),
    description: ar("في الظلمة، أحدهم خلط بين شخصين — الشهادة صارت أضعف."),
    commitments: [
      {
        factKey: "witness.reliability",
        value: "reduced",
        fromContradiction: "primaryPlayer",
        label: ar("شهادة {{player}} صارت أقل موثوقية بسبب الظلمة"),
      },
    ],
    scoreEffects: { plausibility: -4 },
    followUpQuestionIds: ["followup.identity_confusion", "followup.who_requested_parking_trip"],
  },
  {
    id: "patch.storage_charger_admission.v1",
    archetype: "partial_admission",
    resolvesCategories: ["EVIDENCE_COLLISION"],
    publicLabel: ar("دخل المستودع بس عشان شاحن"),
    description: ar("نعترف إنه دخل المستودع لحظة عشان ياخذ شاحن، ورجع بسرعة."),
    commitments: [
      {
        factKey: "storage.motive",
        value: "charger",
        fromContradiction: "primaryPlayer",
        label: ar("{{player}} دخل المستودع عشان شاحن"),
      },
      {
        factKey: "storage.return_time",
        value: "before_2348",
        label: ar("لازم يثبت إنه رجع قبل ١١:٤٨"),
      },
    ],
    scoreEffects: { plausibility: -2, stability: -3 },
    followUpQuestionIds: [
      "followup.charger_owner",
      "followup.return_time",
      "followup.returned_before_wifi_event",
    ],
  },
  {
    id: "patch.auto_corridor_connection.v1",
    archetype: "evidence_reinterpretation",
    resolvesCategories: ["EVIDENCE_COLLISION"],
    publicLabel: ar("الجهاز اتصل تلقائيًا من الممر"),
    description: ar("نفسّر إن الجهاز اتصل بشبكة المستودع تلقائيًا وهو بالممر، بدون دخول."),
    commitments: [
      {
        factKey: "wifi.explanation",
        value: "corridor_auto",
        fromContradiction: "primaryPlayer",
        label: ar("{{player}} يقول إن الاتصال كان تلقائي من الممر"),
      },
    ],
    scoreEffects: { plausibility: -6 },
    followUpQuestionIds: ["followup.return_time"],
  },
  {
    id: "patch.align_location.v1",
    archetype: "shift_time",
    resolvesCategories: ["LOCKED_FACT_BREAK", "MAJORITY_ANOMALY"],
    publicLabel: ar("نعدّل مكانه في الرواية"),
    description: ar("نثبّت مكان جديد يوافق إجابته، بس نخسر شوي من ثبات الرواية."),
    commitments: [
      {
        factKey: "location.restated",
        value: "adjusted",
        fromContradiction: "primaryPlayer",
        label: ar("عدّلنا مكان {{player}} في الرواية"),
      },
    ],
    scoreEffects: { stability: -4 },
    followUpQuestionIds: ["followup.return_time"],
  },
];

// ---------------------------------------------------------------------------
// Case assembly
// ---------------------------------------------------------------------------

export const missingPayrollEnvelopeV1: GameCase = {
  id: "case.missing_payroll.v1",
  version: "1.0.0",
  title: ar("ظرف الرواتب المفقود", "The Missing Payroll Envelope"),
  pitch: ar("اختفى ظرف الرواتب وأنتم آخر مجموعة داخل الشركة. اتفقوا على رواية… ولا تخربونها."),
  premise: ar(
    "اختفى ظرف الرواتب من المكتب بين الساعة ١١:٣٠ و ١٢:٠٠. أنتم آخر مجموعة كانت داخل المبنى.",
  ),
  complexity: ar("مبتدئ", "Beginner"),
  playerCounts: [4, 5, 6],
  durationMinutes: [10, 15],
  immutableEvidence: [
    {
      id: "ev.power_failure",
      title: ar("انقطاع الكهرباء"),
      detail: ar("انقطعت الكهرباء الساعة ١١:٤٦."),
      timestamp: "23:46",
      asserts: [{ tag: "power_failure", value: "2346" }],
    },
    {
      id: "ev.vehicle_left",
      title: ar("سيارة تغادر"),
      detail: ar("سيارة مسجّلة للمجموعة طلعت من المواقف الساعة ١٢:٠١."),
      timestamp: "00:01",
      asserts: [{ tag: "vehicle_left", value: "0001" }],
    },
    {
      id: "ev.wifi_storage",
      title: ar("اتصال شبكة المستودع"),
      detail: ar("جهاز واحد اتصل بشبكة المستودع الساعة ١١:٤٨."),
      timestamp: "23:48",
      asserts: [{ tag: "wifi_storage", value: "2348" }],
    },
    {
      id: "ev.security_call",
      title: ar("اتصال بالحارس"),
      detail: ar("الحارس استقبل اتصال خلال فترة الحادثة."),
      asserts: [{ tag: "security_call", value: "window" }],
    },
  ],
  surpriseEvidence: {
    id: "ev.storage_door_opened",
    title: ar("باب المستودع"),
    detail: ar("باب المستودع انفتح الساعة ١١:٤٨ — بعد انقطاع الكهرباء."),
    timestamp: "23:48",
    asserts: [{ tag: "storage_door", value: "2348" }],
  },
  privateEvidencePool: [
    {
      id: "pe.own_device_wifi",
      title: ar("جهازك هو اللي اتصل"),
      detail: ar("جهازك هو اللي اتصل بشبكة المستودع الساعة ١١:٤٨."),
      asserts: [{ tag: "holder_storage_presence", value: "yes" }],
    },
    {
      id: "pe.vehicle_camera",
      title: ar("سيارتك على الكاميرا"),
      detail: ar("كاميرا الشارع صوّرت سيارتك وهي تطلع."),
      asserts: [{ tag: "holder_vehicle", value: "yes" }],
    },
    {
      id: "pe.receipt_2339",
      title: ar("فاتورة الساعة ١١:٣٩"),
      detail: ar("عندك فاتورة تحطّك قريب من المبنى الساعة ١١:٣٩."),
      asserts: [{ tag: "holder_near_building", value: "2339" }],
    },
    {
      id: "pe.security_voice",
      title: ar("الحارس يذكر صوتك"),
      detail: ar("الحارس يقول إنه يذكر صوتك في الاتصال."),
      asserts: [{ tag: "holder_called_security", value: "yes" }],
    },
    {
      id: "pe.storage_key_record",
      title: ar("سجل مفتاح المستودع"),
      detail: ar("السجل يقول إنك آخر من استلم مفتاح المستودع."),
      asserts: [{ tag: "holder_key", value: "yes" }],
    },
    {
      id: "pe.dead_battery",
      title: ar("بطاريتك خلصت"),
      detail: ar("بطارية جوالك كانت فاضية جزء من الوقت."),
      asserts: [{ tag: "holder_dead_battery", value: "yes" }],
    },
  ],
  evidenceConstraints: {
    requireExactlyOne: ["pe.own_device_wifi"],
    mutuallyExclusive: [["pe.own_device_wifi", "pe.dead_battery"]],
  },
  planning: { reasons, locations, roles },
  questions,
  contradictionRules,
  plausibilityRules,
  patches,
  scoring: {
    initial: { consistency: 100, plausibility: 100, stability: 100, evasion: 0 },
    evasionPerAnswer: 10,
    noResponsePenalty: [
      { axis: "consistency", delta: -6 },
      { axis: "evasion", delta: 8 },
    ],
    stabilityBreakPenalty: 6,
    compositeWeights: { consistency: 0.5, plausibility: 0.3, stability: 0.2 },
    evasionCompositeWeight: 0.5,
  },
  verdictBands: [
    {
      band: "F",
      label: ar("رواية منهارة"),
      summary: ar("الرواية انهارت وتناقضاتها كثيرة."),
      minComposite: 0,
      maxComposite: 39,
    },
    {
      band: "D",
      label: ar("التحقيق لا يزال مفتوح"),
      summary: ar("فيه ثغرات كثيرة، القضية ما انقفلت."),
      minComposite: 40,
      maxComposite: 54,
    },
    {
      band: "C",
      label: ar("تحديد مشتبه رئيسي"),
      summary: ar("الرواية كشفت مشتبه واضح."),
      minComposite: 55,
      maxComposite: 69,
    },
    {
      band: "B",
      label: ar("أدلة غير كافية"),
      summary: ar("الرواية صمدت، بس فيها شكوك بسيطة."),
      minComposite: 70,
      maxComposite: 84,
    },
    {
      band: "A",
      label: ar("أُطلق سراحكم"),
      summary: ar("رواية متماسكة — المحقق ما لقى تناقض حاسم."),
      minComposite: 85,
      maxComposite: 100,
    },
  ],
  copy: {
    privateEvidenceIntro: ar("هذا الدليل عندك لحالك. لا تورّي شاشتك لأحد."),
    interrogationBanner: ar("من هنا كل واحد لحاله — لا تتكلمون."),
    planReviewIntro: ar("آخر مراجعة… بعدها تختفي الرواية."),
  },
};
