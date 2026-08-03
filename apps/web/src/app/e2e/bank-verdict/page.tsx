"use client";

import { getBankVerdictBand, getBankVoteStatus } from "@/components/game/BankRoom";

export default function BankVerdictEvidencePage() {
  const exposed = getBankVerdictBand(100);
  const voteCounts = [4, 5, 6].map((count) => ({ count, ...getBankVoteStatus(count) }));
  return (
    <main id="main">
      <section data-testid="bank-exposed-verdict">
        <h1>{exposed.title}</h1>
        <p>{exposed.copy}</p>
        <strong><bdi>100%</bdi></strong>
      </section>
      {voteCounts.map((vote) => (
        <p key={vote.count} data-testid={`bank-vote-status-${vote.count}`}>
          {vote.beforeMajority} <bdi>{vote.strictMajority}</bdi> {vote.afterMajority}
        </p>
      ))}
    </main>
  );
}
