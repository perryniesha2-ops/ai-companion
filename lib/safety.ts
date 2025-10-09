// lib/safety.ts
export function selfHarmSafeReply(): string {
  return [
    "I’m really sorry you’re feeling this way. I can’t help with anything that could harm you,",
    "but you’re not alone and you deserve support. If you’re in immediate danger, please call your local emergency number.",
    "",
    "In the U.S., you can call or text **988** (Suicide & Crisis Lifeline).",
    "In the U.K. & ROI, Samaritans are at **116 123**.",
    "In Canada, call or text **988**.",
    "You can also find local resources at <https://findahelpline.com>.",
    "",
    "If you’d like, we can talk about what’s been hardest today and think through one small step that could help you feel a little safer right now."
  ].join(" ");
}
