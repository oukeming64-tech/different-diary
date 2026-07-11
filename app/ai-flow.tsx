"use client";

import { ArrowLeft, Check, KeyRound, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  OpenRouterProvider,
  requestCompanionResponse,
  type CompanionResult,
} from "../lib/stage4";
import type { CheckInState, LocalResponse } from "../lib/stage1";

import "./ai-flow.css";

export type AIFlowProps = {
  state: CheckInState;
  stateLabel: string;
  intentLabel: string;
  localResponse: LocalResponse;
  busySaving: boolean;
  onCancel: () => void;
  onSave: (userText: string, response: LocalResponse) => void;
};

export function AIFlow({
  state,
  stateLabel,
  intentLabel,
  localResponse,
  busySaving,
  onCancel,
  onSave,
}: AIFlowProps) {
  const [key, setKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [userText, setUserText] = useState("");
  const [result, setResult] = useState<CompanionResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function provider() {
    return new OpenRouterProvider({
      referer: typeof window === "undefined" ? undefined : window.location.origin,
    });
  }

  async function connect() {
    if (!key.trim()) {
      setNotice("先填入你的 OpenRouter Key。它只在这次打开期间留在页面里。");
      return;
    }
    setConnecting(true);
    setNotice(null);
    try {
      await provider().validateKey(key);
      setConnected(true);
    } catch {
      setConnected(false);
      setNotice("这把 Key 暂时没有连上。可以检查后再试，也可以回去继续用本机回应。");
    } finally {
      setConnecting(false);
    }
  }

  async function send() {
    const text = userText.trim();
    if (!text) {
      setNotice("先写下你想让 AI 听见的那句话。");
      return;
    }
    setSending(true);
    setNotice(null);
    setResult(null);
    const response = await requestCompanionResponse({
      provider: provider(),
      key,
      input: {
        state,
        stateLabel,
        intentLabel,
        localResponse: localResponse.text,
        userText: text,
      },
    });
    setResult(response);
    setNotice(response.notice);
    setSending(false);
  }

  function disconnect() {
    setKey("");
    setConnected(false);
    setResult(null);
    setNotice("Key 已从这次页面中移除。");
  }

  function save() {
    if (!result) return;
    onSave(userText.trim(), {
      key: result.source === "ai" ? "ai.openrouter.session" : localResponse.key,
      text: result.text,
    });
  }

  return (
    <section className="ai-flow screen screen-enter" aria-busy={connecting || sending}>
      <header className="ai-flow__backbar">
        <button type="button" onClick={onCancel}>
          <ArrowLeft size={18} aria-hidden="true" />回到本机回应
        </button>
        <span>可选 AI</span>
      </header>

      <header className="ai-flow__heading">
        <span className="ai-flow__mark" aria-hidden="true"><Sparkles size={22} /></span>
        <p>想让 AI 再听听？</p>
        <h2>把这句话交给它之前，先由你点头。</h2>
      </header>

      {!connected ? (
        <section className="ai-flow__connect" aria-labelledby="ai-connect-title">
          <div>
            <KeyRound size={18} aria-hidden="true" />
            <h3 id="ai-connect-title">连接 OpenRouter</h3>
          </div>
          <p>Key 不会写进记录，也不会跟着导出。离开或刷新后，需要重新连接。</p>
          <label>
            <span>OpenRouter Key</span>
            <input
              autoCapitalize="none"
              autoComplete="off"
              disabled={connecting}
              onChange={(event) => setKey(event.target.value)}
              placeholder="粘贴在这里"
              spellCheck={false}
              type="password"
              value={key}
            />
          </label>
          <button
            className="ai-flow__primary"
            disabled={connecting}
            onClick={() => void connect()}
            type="button"
          >
            <KeyRound size={17} aria-hidden="true" />
            {connecting ? "正在连接…" : "只在这次打开期间连接"}
          </button>
        </section>
      ) : (
        <section className="ai-flow__conversation" aria-labelledby="ai-message-title">
          <div className="ai-flow__connected">
            <span><Check size={15} aria-hidden="true" />已连接，只用于这次对话</span>
            <button onClick={disconnect} type="button">移除 Key</button>
          </div>

          <label className="ai-flow__message">
            <span id="ai-message-title">你想让它听见什么？</span>
            <textarea
              maxLength={1000}
              onChange={(event) => {
                setUserText(event.target.value);
                setResult(null);
              }}
              placeholder="就写眼下最想说的那一句……"
              value={userText}
            />
          </label>

          <p className="ai-flow__consent">
            只有点下面的发送按钮，这段文字和当前选择才会发给 OpenRouter。照片、历史记录和身体资料不会一起发送。
          </p>

          <button
            className="ai-flow__primary"
            disabled={sending || !userText.trim()}
            onClick={() => void send()}
            type="button"
          >
            <Send size={17} aria-hidden="true" />
            {sending ? "正在等一句回应…" : "发送给 OpenRouter"}
          </button>
        </section>
      )}

      {notice && <p className="ai-flow__notice" role="status">{notice}</p>}

      {result && (
        <section className="ai-flow__result" aria-live="polite">
          <p>{result.source === "ai" ? "AI 这样回应" : "先用本机回应"}</p>
          <blockquote>{result.text}</blockquote>
          {result.source === "ai" && <small>经 OpenRouter 路由：{result.model}</small>}
          <div className="ai-flow__result-actions">
            <button
              className="ai-flow__primary"
              disabled={busySaving}
              onClick={save}
              type="button"
            >
              <Check size={17} aria-hidden="true" />
              {busySaving ? "正在记下…" : "把这次对话记在本机"}
            </button>
            <button onClick={() => setResult(null)} type="button">再说一句</button>
          </div>
        </section>
      )}
    </section>
  );
}

export default AIFlow;
