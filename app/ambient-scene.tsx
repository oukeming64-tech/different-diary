export type AmbientSceneTone =
  | "home"
  | "food"
  | "rest"
  | "tired"
  | "sit"
  | "memory";

export type AmbientSceneProps = {
  tone?: AmbientSceneTone;
  className?: string;
};

const TONE_STATUS: Record<AmbientSceneTone, string> = {
  home: "慢慢来",
  food: "想吃也没关系",
  rest: "允许休息",
  tired: "先喘口气",
  sit: "安静坐会儿",
  memory: "只替你记住",
};

/**
 * Decorative, data-free backdrop for the stage 1 screens.
 *
 * Animation and reduced-motion behavior intentionally live in CSS. Keeping the
 * scene as plain elements lets every screen reuse it without media assets or
 * client-side effects.
 */
export function AmbientScene({
  tone = "home",
  className = "",
}: AmbientSceneProps) {
  const rootClassName = [
    "ambient-scene",
    `ambient-scene--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      aria-hidden="true"
      className={rootClassName}
      data-tone={tone}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="ambient-scene__auroras">
        <span className="ambient-scene__aurora ambient-scene__aurora--food" />
        <span className="ambient-scene__aurora ambient-scene__aurora--rest" />
        <span className="ambient-scene__aurora ambient-scene__aurora--tired" />
        <span className="ambient-scene__aurora ambient-scene__aurora--sit" />
      </div>

      <div className="ambient-scene__haze ambient-scene__haze--near" />
      <div className="ambient-scene__haze ambient-scene__haze--far" />

      <div className="ambient-scene__orbit ambient-scene__orbit--wide">
        <span className="ambient-scene__orbit-line" />
        <span className="ambient-scene__light ambient-scene__light--one" />
        <span className="ambient-scene__light ambient-scene__light--two" />
      </div>

      <div className="ambient-scene__orbit ambient-scene__orbit--close">
        <span className="ambient-scene__orbit-line" />
        <span className="ambient-scene__light ambient-scene__light--three" />
      </div>

      <div className="ambient-scene__dust" aria-hidden="true">
        <span className="ambient-scene__mote ambient-scene__mote--one" />
        <span className="ambient-scene__mote ambient-scene__mote--two" />
        <span className="ambient-scene__mote ambient-scene__mote--three" />
        <span className="ambient-scene__mote ambient-scene__mote--four" />
        <span className="ambient-scene__mote ambient-scene__mote--five" />
      </div>

      <div className="ambient-scene__signal">
        <span className="ambient-scene__signal-ring" />
        <span className="ambient-scene__signal-mark">啪</span>
        <span className="ambient-scene__signal-copy">{TONE_STATUS[tone]}</span>
      </div>
    </div>
  );
}

export default AmbientScene;
