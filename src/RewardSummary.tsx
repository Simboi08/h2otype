import type { Session } from "./typingEngine";

export default function RewardSummary({
  session,
  zen = false,
}: {
  session: Session;
  zen?: boolean;
}) {
  return (
    <div className="reward-summary">
      <p className="session-xp">
        +{session.xpEarned} XP this {zen ? "session" : "run"}
      </p>
      <dl className="reward-details">
        <div>
          <dt>Base XP</dt>
          <dd data-testid="base-xp">{session.baseXp}</dd>
        </div>
        <div>
          <dt>Combo bonus</dt>
          <dd data-testid="bonus-xp">
            +{Math.floor(session.bonusTenths / 10)} XP
          </dd>
        </div>
        <div>
          <dt>Best combo</dt>
          <dd data-testid="best-combo">{session.bestCombo}</dd>
        </div>
      </dl>
    </div>
  );
}
