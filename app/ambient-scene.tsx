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
      <div className="ambient-scene__sky">
        <span className="ambient-scene__evening-light" />
      </div>

      <div className="ambient-scene__mist ambient-scene__mist--sky" />

      <div className="ambient-scene__mountains">
        <span className="ambient-scene__ridge ambient-scene__ridge--far" />
        <span className="ambient-scene__ridge ambient-scene__ridge--middle" />
        <span className="ambient-scene__ridge ambient-scene__ridge--near" />
      </div>

      <div className="ambient-scene__water">
        <span className="ambient-scene__water-line ambient-scene__water-line--one" />
        <span className="ambient-scene__water-line ambient-scene__water-line--two" />
        <span className="ambient-scene__water-line ambient-scene__water-line--three" />
        <span className="ambient-scene__water-line ambient-scene__water-line--four" />
        <span className="ambient-scene__chair-reflection" />
      </div>

      <div className="ambient-scene__mist ambient-scene__mist--water" />

      <div className="ambient-scene__chair">
        <span className="ambient-scene__chair-shadow" />
        <span className="ambient-scene__chair-back">
          <i />
          <i />
          <i />
        </span>
        <span className="ambient-scene__chair-seat" />
        <span className="ambient-scene__chair-leg ambient-scene__chair-leg--left" />
        <span className="ambient-scene__chair-leg ambient-scene__chair-leg--right" />
        <span className="ambient-scene__chair-brace" />
      </div>

      <div className="ambient-scene__bank ambient-scene__bank--left" />
      <div className="ambient-scene__bank ambient-scene__bank--right" />

      <div className="ambient-scene__reeds ambient-scene__reeds--left">
        <span className="ambient-scene__reed ambient-scene__reed--one" />
        <span className="ambient-scene__reed ambient-scene__reed--two" />
        <span className="ambient-scene__reed ambient-scene__reed--three" />
        <span className="ambient-scene__reed ambient-scene__reed--four" />
        <span className="ambient-scene__reed ambient-scene__reed--five" />
      </div>

      <div className="ambient-scene__reeds ambient-scene__reeds--right">
        <span className="ambient-scene__reed ambient-scene__reed--six" />
        <span className="ambient-scene__reed ambient-scene__reed--seven" />
        <span className="ambient-scene__reed ambient-scene__reed--eight" />
      </div>

      <div className="ambient-scene__depth-veil" />
    </div>
  );
}

export default AmbientScene;
