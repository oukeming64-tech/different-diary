"use client";

import { useState } from "react";

type BranchId = "food" | "rest" | "tired" | "visit";

type Option = {
  label: string;
  reply: string;
};

type Branch = {
  id: BranchId;
  icon: string;
  label: string;
  shortLabel: string;
  hint: string;
  eyebrow: string;
  response: string;
  tone: string;
  options: Option[];
};

const branches: Branch[] = [
  {
    id: "food",
    icon: "食",
    label: "我想吃点东西",
    shortLabel: "想吃点东西",
    hint: "先不算，也不劝你忍住",
    eyebrow: "想吃这件事，可以先被听见",
    response:
      "想吃就可以吃。你不需要先向我证明自己今天表现得很好。",
    tone: "apricot",
    options: [
      {
        label: "我只是想听你说，吃也没关系",
        reply: "吃也没关系。真的。你不需要用愧疚为一口食物付费。",
      },
      {
        label: "陪我想想，我是真的饿还是太累了",
        reply:
          "我们可以慢一点分辨。无论是饿了，还是累到想找点安慰，都值得被照顾。",
      },
      {
        label: "我想拍下来，但不要算热量",
        reply: "可以。这里只把它当作今天的一小段生活，不给它打分。",
      },
      {
        label: "给我一个宽松的热量范围",
        reply:
          "等图片功能上线后，只有你主动提出时才会估一个宽松范围，而且数字不会变成判决。",
      },
      {
        label: "什么也不用做，替我记住就好",
        reply: "好。现在先放在这里，不分析，也不追问。",
      },
    ],
  },
  {
    id: "rest",
    icon: "歇",
    label: "我今天不想练",
    shortLabel: "今天不想练",
    hint: "休息不是一次失败",
    eyebrow: "今天已经消耗了不少力气",
    response:
      "不想练也可以。上班、通勤和处理生活，本来就在消耗你。",
    tone: "blue",
    options: [
      {
        label: "今天就休息",
        reply: "好，今天就休息。休息本身不需要找理由。",
      },
      {
        label: "玩会儿游戏或看剧",
        reply: "去吧。今晚可以只是一个普通、松一点的晚上。",
      },
      {
        label: "出门走走",
        reply: "可以随便走走，不计步数，也不用把它叫作训练。",
      },
      {
        label: "逛逛商场或买点东西",
        reply: "听起来不错。出去换换空气，不必顺便完成什么任务。",
      },
      {
        label: "做五分钟轻松活动",
        reply: "五分钟之后想停就停。它不是补偿，只是让身体舒服一点。",
      },
      {
        label: "不想选，陪我待一会儿",
        reply: "那我们就待一会儿。你不需要马上振作起来。",
      },
    ],
  },
  {
    id: "tired",
    icon: "累",
    label: "我刚练完，很累",
    shortLabel: "刚练完，很累",
    hint: "先喘口气，再说别的",
    eyebrow: "今天已经做得够多了",
    response:
      "现在不需要立刻证明这次运动值得。先让身体慢慢停下来。",
    tone: "green",
    options: [
      {
        label: "我只是想休息",
        reply: "那就休息。今天到这里已经足够了。",
      },
      {
        label: "我现在很想吃",
        reply: "练完想吃很正常。先照顾身体，不用把这份需要当成麻烦。",
      },
      {
        label: "帮我记下今天练过了",
        reply: "记住了：今天你练过，也真的累了。没有分数，只有这件事。",
      },
      {
        label: "我想说说此刻的感受",
        reply: "可以慢慢说。这里不会把你的感受改写成下一项任务。",
      },
    ],
  },
  {
    id: "visit",
    icon: "坐",
    label: "没什么，只是来坐坐",
    shortLabel: "只是来坐坐",
    hint: "没有任务，也算一种状态",
    eyebrow: "欢迎回来",
    response:
      "你不需要每次来都带着问题。我们可以安静待一会儿。",
    tone: "lilac",
    options: [
      {
        label: "给我一句轻松的话",
        reply: "今天不必被总结。现在这一小会儿，属于你自己。",
      },
      {
        label: "我想安静待着",
        reply: "好。这里没有倒计时，也没有催促。",
      },
      {
        label: "其实我有一点想说",
        reply: "那就从最容易说的那一句开始。说到哪里都可以停。",
      },
      {
        label: "看一眼就走",
        reply: "当然可以。你来过，就已经够了。下次见。",
      },
    ],
  },
];

export default function Home() {
  const [activeBranchId, setActiveBranchId] = useState<BranchId | null>(null);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  const activeBranch = branches.find(
    (branch) => branch.id === activeBranchId,
  );

  function openBranch(id: BranchId) {
    setActiveBranchId(id);
    setSelectedOption(null);
  }

  function goHome() {
    setActiveBranchId(null);
    setSelectedOption(null);
  }

  return (
    <main className="prototype-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <section className="phone-surface" aria-live="polite">
        {!activeBranch ? (
          <div className="home-view view-enter">
            <header className="topbar">
              <div className="brand" aria-label="减肥拍拍乐">
                <span className="brand-mark" aria-hidden="true">
                  啪
                </span>
                <span>减肥拍拍乐</span>
              </div>
              <span className="prototype-badge">
                <span aria-hidden="true" />阶段 0 原型
              </span>
            </header>

            <div className="home-intro">
              <p className="soft-kicker">嗨，先不用交作业</p>
              <h1>你现在需要什么？</h1>
              <p className="intro-copy">
                选一个最接近的就好。这里没有正确答案。
              </p>
            </div>

            <div className="branch-grid" aria-label="四个核心入口">
              {branches.map((branch, index) => (
                <button
                  className={`branch-card ${branch.tone}`}
                  data-testid={`branch-${branch.id}`}
                  key={branch.id}
                  onClick={() => openBranch(branch.id)}
                  style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
                  type="button"
                >
                  <span className="card-topline">
                    <span className="branch-icon" aria-hidden="true">
                      {branch.icon}
                    </span>
                    <span className="arrow" aria-hidden="true">
                      ↗
                    </span>
                  </span>
                  <span className="branch-label">{branch.label}</span>
                  <span className="branch-hint">{branch.hint}</span>
                </button>
              ))}
            </div>

            <footer className="home-footer">
              <span className="privacy-dot" aria-hidden="true" />
              <span>这版只演示交互，不登录，也不会保存你的选择</span>
            </footer>
          </div>
        ) : (
          <div className={`branch-view view-enter ${activeBranch.tone}`}>
            <header className="branch-topbar">
              <button className="back-button" onClick={goHome} type="button">
                <span aria-hidden="true">←</span>
                回到四个入口
              </button>
              <span className="no-task-pill">不用完成任务</span>
            </header>

            {!selectedOption ? (
              <div className="branch-content">
                <div className="branch-heading">
                  <span className="detail-icon" aria-hidden="true">
                    {activeBranch.icon}
                  </span>
                  <p>{activeBranch.eyebrow}</p>
                  <h2>{activeBranch.shortLabel}</h2>
                </div>

                <div className="companion-card">
                  <span className="companion-label">先听我说</span>
                  <p>{activeBranch.response}</p>
                </div>

                <div className="choice-section">
                  <p className="choice-label">现在更希望我怎么陪你？</p>
                  <div className="choice-list">
                    {activeBranch.options.map((option) => (
                      <button
                        className="choice-button"
                        key={option.label}
                        onClick={() => setSelectedOption(option)}
                        type="button"
                      >
                        <span>{option.label}</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button className="quiet-link" onClick={goHome} type="button">
                  现在什么也不想选
                </button>
              </div>
            ) : (
              <div className="reply-view view-enter">
                <div className="reply-orbit" aria-hidden="true">
                  <span>{activeBranch.icon}</span>
                </div>
                <p className="reply-kicker">好，就按你说的来</p>
                <h2>{selectedOption.label}</h2>
                <div className="final-reply">
                  <span className="quote-mark" aria-hidden="true">
                    “
                  </span>
                  <p>{selectedOption.reply}</p>
                </div>
                <div className="reply-actions">
                  <button className="primary-button" onClick={goHome} type="button">
                    回到首页
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setSelectedOption(null)}
                    type="button"
                  >
                    换一个选择
                  </button>
                </div>
                <p className="prototype-note">
                  原型提示：这次选择没有被保存，也没有调用 AI。
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
