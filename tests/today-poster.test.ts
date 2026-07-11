import assert from "node:assert/strict";
import test from "node:test";

import type { ActivityRecordV1, CheckInV1 } from "../lib/stage1";
import { createTodayPosterModel } from "../lib/poster";

function record({
  id,
  state,
  intentId,
  occurredAt,
  userText = null,
  responseText = "本机回应",
}: {
  id: string;
  state: CheckInV1["state"];
  intentId: string;
  occurredAt: string;
  userText?: string | null;
  responseText?: string;
}): CheckInV1 {
  return {
    id,
    localUserId: "local-user",
    occurredAt,
    state,
    intentId,
    userText,
    responseKey: `${state}.${intentId}.1`,
    responseText,
    helpful: null,
  };
}

test("uses only today's saved choices and keeps private text out of the poster", () => {
  const now = new Date(2026, 6, 11, 18, 0, 0);
  const morning = new Date(2026, 6, 11, 9, 30, 0).toISOString();
  const evening = new Date(2026, 6, 11, 17, 45, 0).toISOString();
  const yesterday = new Date(2026, 6, 10, 20, 0, 0).toISOString();
  const model = createTodayPosterModel({
    now,
    records: [
      record({
        id: "evening",
        state: "rest",
        intentId: "full-rest",
        occurredAt: evening,
        userText: "这句私人原话不能出现在海报里",
        responseText: "这句 AI 或本机回应也不能出现",
      }),
      record({
        id: "morning",
        state: "food",
        intentId: "permission",
        occurredAt: morning,
      }),
      record({
        id: "yesterday",
        state: "visit",
        intentId: "quiet",
        occurredAt: yesterday,
      }),
    ],
    activities: [],
  });

  assert.deepEqual(model.moments.map((moment) => moment.id), ["morning", "evening"]);
  assert.deepEqual(model.headline, ["今天，有几种心情。", "都留在这里了。"]);
  assert.equal(model.hiddenCount, 0);
  assert.doesNotMatch(JSON.stringify(model), /私人原话|AI 或本机回应/);
});

test("summarizes a local activity and caps the visible poster moments", () => {
  const now = new Date(2026, 6, 11, 18, 0, 0);
  const records = Array.from({ length: 7 }, (_, index) =>
    record({
      id: `record-${index}`,
      state: index === 4 ? "tired" : "visit",
      intentId: index === 4 ? "activity-record" : "quiet",
      occurredAt: new Date(2026, 6, 11, 8 + index, 0, 0).toISOString(),
    }),
  ).reverse();
  const activity: ActivityRecordV1 = {
    id: "activity-1",
    localUserId: "local-user",
    checkInId: "record-4",
    createdAt: records[0]?.occurredAt ?? now.toISOString(),
    category: "walking",
    customLabel: null,
    durationMinutes: 20,
    steps: null,
    distanceKm: null,
    note: "这句运动备注也不进海报",
  };

  const model = createTodayPosterModel({ records, activities: [activity], now });

  assert.equal(model.moments.length, 5);
  assert.equal(model.hiddenCount, 2);
  assert.equal(model.moments[4]?.stateLabel, "今天动过了");
  assert.equal(model.moments[4]?.choiceLabel, "走路 · 20 分钟");
  assert.doesNotMatch(JSON.stringify(model), /运动备注/);
});
