import type {
  CheckInState,
  LocalResponse,
  LocalResponseInput,
} from "./types";

export const RECENT_RESPONSE_WINDOW = 3;

export const LOCAL_INTENT_IDS = {
  food: [
    "permission",
    "check-hunger",
    "photo-no-calories",
    "loose-range",
    "remember-only",
  ],
  rest: [
    "full-rest",
    "entertainment",
    "walk",
    "shopping",
    "five-minutes",
    "quiet-company",
  ],
  tired: ["rest", "eat", "remember", "talk"],
  visit: ["light-word", "quiet", "talk", "leave"],
} as const satisfies Record<CheckInState, readonly string[]>;

const RESPONSE_TEXTS = {
  food: {
    permission: [
      "吃也没关系。你不需要用愧疚为这一口付费。",
      "可以吃。今天的你不必先证明自己足够自律。",
      "想吃的念头可以被好好接住，不需要立刻变成一道考题。",
      "去照顾这份想吃的感觉吧，这里不会因此给你扣分。",
    ],
    "check-hunger": [
      "我们可以慢一点分辨。无论是饿了，还是累到想找点安慰，都值得被照顾。",
      "先听一听身体也好。答案不必很准确，饿和累都不是错误。",
      "可以给自己一点时间看看：胃里空不空，心里是不是也累了。无论是哪种，都不用责怪自己。",
      "不急着下结论。也许是饿，也许是疲惫在敲门，我们先温柔地看一眼。",
    ],
    "photo-no-calories": [
      "可以。这里只把它当作今天的一小段生活，不给它打分。",
      "拍下来就好，不计算，也不把一顿饭变成成绩单。",
      "这一餐可以只是被记住，不需要附带数字或评价。",
      "留下一张照片就够了。它属于你的生活，不属于一张热量报表。",
    ],
    "loose-range": [
      "等图片能力由你主动开启后，我们只给宽松范围，不把数字当作判决。现在先安心吃饭。",
      "可以保留这个需要。以后只有你主动选择时才估一个大概，眼下不用等数字批准。",
      "宽松范围应该只是参考，不是命令。当前离线版本不会假装知道这餐的热量。",
      "记住了：你要的是大致参考，不是精确审判。现在这版先不编一个数字给你。",
    ],
    "remember-only": [
      "好。现在先放在这里，不分析，也不追问。",
      "记住了。它就是今天发生过的一件普通事情。",
      "可以，只留下这一刻，不需要为它补一段解释。",
      "好，我替你把这次轻轻放好，不把它变成结论。",
    ],
  },
  rest: {
    "full-rest": [
      "好，今天就休息。休息本身不需要找理由。",
      "今天可以停在这里。没有欠下的训练，也没有需要补交的作业。",
      "那就让今晚松下来，身体不必每天都保持用力。",
      "可以完整地休息一次，不用把它包装成恢复计划。",
    ],
    entertainment: [
      "去吧。今晚可以只是一个普通、松一点的晚上。",
      "游戏或一集喜欢的剧，都可以是今晚的小住处。",
      "给脑子换个频道吧，不需要顺便完成任何健康任务。",
      "可以把这段时间还给自己，开心不需要有训练价值。",
    ],
    walk: [
      "可以随便走走，不计步数，也不用把它叫作训练。",
      "想出门就慢慢晃一会儿，什么时候想回来都可以。",
      "让风吹一吹也好，不设路线，不追配速。",
      "这次散步只为舒服一点，不需要证明任何东西。",
    ],
    shopping: [
      "听起来不错。出去换换空气，不必顺便完成什么任务。",
      "可以去看看喜欢的东西，逛街不需要被换算成运动量。",
      "随便走走、随便看看就好，今晚没有隐藏目标。",
      "去给生活换个画面吧，不计步，也不要求满载而归。",
    ],
    "five-minutes": [
      "五分钟之后想停就停。只是让身体舒服一点。",
      "可以轻轻动一会儿，开始了也随时有权结束。",
      "把这五分钟当成伸个懒腰，不当成必须完成的训练。",
      "只做到身体觉得舒服的程度就好，今天不需要加码。",
    ],
    "quiet-company": [
      "那我们就待一会儿。你不需要马上振作起来。",
      "好，先什么都不选。这里不会催你做下一步。",
      "可以安静一下，今天不必靠行动证明什么。",
      "我在。没有倒计时，也没有需要回答的问题。",
    ],
  },
  tired: {
    rest: [
      "那就休息。今天到这里已经足够了。",
      "先让身体慢慢停下来，剩下的事可以晚一点再说。",
      "现在不用复盘，也不用追加任务。坐下或躺一会儿吧。",
      "累了就停，这是身体在说话，不是你不够努力。",
    ],
    eat: [
      "练完想吃很正常。先照顾身体，不用把这份需要当成麻烦。",
      "可以去吃点东西，运动后的饥饿不需要被怀疑。",
      "身体在要补给，不是在给你出难题。慢慢吃就好。",
      "想吃就去照顾它，不必先计算这次运动换来了多少资格。",
    ],
    remember: [
      "记住了：今天你练过，也真的累了。没有分数，只有这件事。",
      "好，我把今天这段用力和疲惫一起留下，不做比较。",
      "已经记下。它不需要被换算成任何指标。",
      "这次经历会按原样留下：你动过，也累了，仅此而已。",
    ],
    talk: [
      "可以慢慢说。这里不会把你的感受改写成下一项任务。",
      "你可以从最明显的感觉说起，也可以说到一半就停。",
      "我听着。累、满足、烦躁或空白，都可以原样待在这里。",
      "不用整理成漂亮的话，想到哪儿就说到哪儿。",
    ],
  },
  visit: {
    "light-word": [
      "今天不必被总结。现在这一小会儿，属于你自己。",
      "不用赶着变得更好，先舒服地呼吸一会儿。",
      "普通的一天也值得有一个柔软的停顿。",
      "你可以暂时把外面的声音调低一点。",
    ],
    quiet: [
      "好。这里没有倒计时，也没有催促。",
      "那就安静待一会儿，什么都不发生也很好。",
      "我陪你坐着，不提问题，也不安排下一步。",
      "可以不说话。你不需要用表达换取陪伴。",
    ],
    talk: [
      "那就从最容易说的那一句开始。说到哪里都可以停。",
      "想说什么都可以，不需要先确定它够不够重要。",
      "我在听。零碎的、模糊的感受也可以慢慢放下来。",
      "不用组织好再开口，第一句是什么就从哪里开始。",
    ],
    leave: [
      "当然可以。你来过，就已经够了。下次见。",
      "好，轻轻看一眼也算来过。去忙你的吧。",
      "随时可以走，不用完成告别仪式。",
      "那就先到这里。这里不会因为停留很短而少欢迎你一点。",
    ],
  },
} as const satisfies Record<
  CheckInState,
  Record<string, readonly [string, string, string, string]>
>;

const FALLBACK_RESPONSES: Record<CheckInState, LocalResponse> = {
  food: {
    key: "food.fallback",
    text: "想吃这件事可以先被听见。你不需要马上解释，也不需要证明什么。",
  },
  rest: {
    key: "rest.fallback",
    text: "今天可以先松一点。你可以安心休息。",
  },
  tired: {
    key: "tired.fallback",
    text: "你已经很累了。先照顾身体，别的事情可以等一等。",
  },
  visit: {
    key: "visit.fallback",
    text: "欢迎回来。你可以什么都不做，只在这里待一会儿。",
  },
};

const UNIVERSAL_FALLBACK: LocalResponse = {
  key: "visit.fallback",
  text: "欢迎回来。你可以什么都不做，只在这里待一会儿。",
};

export function getStateFallbackResponse(state: CheckInState): LocalResponse {
  return FALLBACK_RESPONSES[state] ?? UNIVERSAL_FALLBACK;
}

function getCandidates(
  state: CheckInState,
  intentId: string,
): LocalResponse[] {
  const stateResponses = RESPONSE_TEXTS[state] as
    | Record<string, readonly string[]>
    | undefined;
  const texts = stateResponses?.[intentId];

  return (texts ?? []).map((text, index) => ({
    key: `${state}.${intentId}.${index + 1}`,
    text,
  }));
}

export function selectLocalResponse(input: LocalResponseInput): LocalResponse {
  const candidates = getCandidates(input.state, input.intentId);
  if (candidates.length === 0) {
    return getStateFallbackResponse(input.state);
  }

  // listCheckIns() is newest-first, so callers pass keys in that same order.
  const recentlyUsed = new Set(
    input.recentResponseKeys.slice(0, RECENT_RESPONSE_WINDOW),
  );

  return (
    candidates.find((candidate) => !recentlyUsed.has(candidate.key)) ??
    candidates[0]
  );
}
