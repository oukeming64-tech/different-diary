"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import "./onboarding-guide.css";

const STEPS = [
  {
    eyebrow: "第一步",
    title: "先挑一句，像你现在就好",
    copy: "想吃、不想练、刚练完很累，或者只是来坐坐。选一句，就从那里开始。",
    icon: MessageCircleHeart,
  },
  {
    eyebrow: "第二步",
    title: "先听一句本机回应",
    copy: "不用登录，也不用 Key。你可以直接记下，也可以什么都不留，关掉页面就走。",
    icon: ShieldCheck,
  },
  {
    eyebrow: "第三步",
    title: "想多说一点，再找 AI",
    copy: "在回应页往下看，点“想让 AI 再听听”。Key 由你连接，真正发送前，页面还会再问一次。",
    icon: Sparkles,
  },
] as const;

export const ONBOARDING_PREFERENCE_KEY =
  "jianfei-paipai:onboarding-complete:v1";

export type OnboardingGuideProps = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export function OnboardingGuide({
  open,
  onClose,
  onComplete,
}: OnboardingGuideProps) {
  const [step, setStep] = useState(0);
  const titleId = useId();
  const copyId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding-guide" role="presentation">
      <section
        aria-describedby={copyId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="onboarding-guide__sheet"
        role="dialog"
      >
        <header className="onboarding-guide__topbar">
          <span>第一次来这里</span>
          <button
            aria-label="关闭新手引导"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <ol className="onboarding-guide__progress" aria-label={`新手引导第 ${step + 1} 步，共 ${STEPS.length} 步`}>
          {STEPS.map((item, index) => (
            <li
              aria-current={index === step ? "step" : undefined}
              className={index <= step ? "is-reached" : ""}
              key={item.eyebrow}
            >
              <span>{index + 1}</span>
            </li>
          ))}
        </ol>

        <div className="onboarding-guide__body">
          <span className="onboarding-guide__icon" aria-hidden="true">
            <StepIcon size={24} strokeWidth={1.7} />
          </span>
          <p className="onboarding-guide__eyebrow">{current.eyebrow}</p>
          <h2 id={titleId}>{current.title}</h2>
          <p className="onboarding-guide__copy" id={copyId}>{current.copy}</p>

          {step === 0 && (
            <div className="onboarding-guide__states" aria-hidden="true">
              <span>想吃点东西</span>
              <span>今天不想练</span>
              <span>刚练完，很累</span>
              <span>只是来坐坐</span>
            </div>
          )}

          {step === 1 && (
            <div className="onboarding-guide__local-path" aria-hidden="true">
              <span>本机回应</span>
              <ArrowRight size={14} />
              <span>记下，或直接离开</span>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-guide__ai-preview" aria-hidden="true">
              <span><Sparkles size={18} /></span>
              <span>
                <strong>想让 AI 再听听</strong>
                <small>回应页靠下的位置 · 可选 AI</small>
              </span>
              <ArrowRight size={17} />
            </div>
          )}
        </div>

        <footer className="onboarding-guide__actions">
          {step > 0 ? (
            <button
              className="onboarding-guide__back"
              onClick={() => setStep((currentStep) => currentStep - 1)}
              type="button"
            >
              <ArrowLeft size={17} aria-hidden="true" />上一步
            </button>
          ) : (
            <button className="onboarding-guide__skip" onClick={onClose} type="button">
              先自己看看
            </button>
          )}

          <button
            className="onboarding-guide__next"
            onClick={() => {
              if (isLast) onComplete();
              else setStep((currentStep) => currentStep + 1);
            }}
            type="button"
          >
            {isLast ? (
              <><Check size={17} aria-hidden="true" />知道了，去选一句</>
            ) : (
              <>下一步<ArrowRight size={17} aria-hidden="true" /></>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default OnboardingGuide;
