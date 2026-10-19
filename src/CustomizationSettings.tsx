import PreferenceSlider from "./PreferenceSlider";
import {
  isParticleStyle,
  isSoundStyle,
  isTypingFont,
  graphicsTiers,
  setPreference,
  typingFonts,
  usePreferences,
} from "./preferences";
import {
  playTypingSound,
  stopTypingSounds,
  useAudioStatus,
} from "./typingSound";

export default function CustomizationSettings() {
  const { preferences } = usePreferences();
  const audioStatus = useAudioStatus();
  const weights: Record<number, string> = {
    400: "Regular",
    500: "Medium",
    600: "Semibold",
    700: "Bold",
  };
  return (
    <>
      <fieldset className="preference-options">
        <legend>Typing appearance</legend>
        <label className="preference-row">
          <span className="preference-label">Typing font</span>
          <select
            className="preference-select"
            value={preferences.typingFont}
            onChange={(event) => {
              if (isTypingFont(event.currentTarget.value))
                setPreference("typingFont", event.currentTarget.value);
            }}
          >
            {typingFonts.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <PreferenceSlider
          label="Character spacing"
          description="Space between letters in the passage and word input."
          min={0}
          max={3}
          step={0.5}
          value={preferences.characterSpacing}
          valueText={`${preferences.characterSpacing}px`}
          onChange={(value) => setPreference("characterSpacing", value)}
        />
        <PreferenceSlider
          label="Font weight"
          min={400}
          max={700}
          step={100}
          value={preferences.typingWeight}
          valueText={weights[preferences.typingWeight]}
          onChange={(value) => setPreference("typingWeight", value)}
        />
        <PreferenceSlider
          label="Typing size"
          description="Scale the passage, word input, and workspace."
          min={80}
          max={130}
          step={10}
          value={preferences.typingScale}
          valueText={`${preferences.typingScale}%`}
          onChange={(value) => setPreference("typingScale", value)}
        />
      </fieldset>
      <fieldset className="preference-options">
        <legend>Graphics</legend>
        <PreferenceSlider
          label="Graphics quality"
          min={0}
          max={2}
          step={1}
          value={graphicsTiers.indexOf(preferences.graphicsTier)}
          valueText={
            { low: "Low", medium: "Medium", high: "High" }[
              preferences.graphicsTier
            ]
          }
          onChange={(value) =>
            setPreference("graphicsTier", graphicsTiers[value])
          }
          endpoints={["Low", "High"]}
        />
        <p className="settings-note">
          {preferences.graphicsTier === "low"
            ? "Fewer particles, no scanlines or glow, and instant XP updates."
            : preferences.graphicsTier === "high"
              ? "More particles, richer glow, and expressive XP motion."
              : "Balanced particles, subtle atmosphere, and smooth XP motion."}
        </p>
      </fieldset>
      <fieldset className="preference-options">
        <legend>Live statistics size</legend>
        <PreferenceSlider
          label="WPM size"
          description="Resize the live WPM label and number. Enable Live WPM below to show it."
          min={80}
          max={200}
          step={10}
          value={preferences.wpmScale}
          valueText={`${preferences.wpmScale}%`}
          onChange={(value) => setPreference("wpmScale", value)}
        />
        <PreferenceSlider
          label="Accuracy size"
          description="Resize the live accuracy label and number."
          min={80}
          max={200}
          step={10}
          value={preferences.accuracyScale}
          valueText={`${preferences.accuracyScale}%`}
          onChange={(value) => setPreference("accuracyScale", value)}
        />
      </fieldset>
      <fieldset className="preference-options">
        <legend>Typing feedback</legend>
        <label className="preference-row">
          <span>
            <span className="preference-label">Combo feedback</span>
            <span className="preference-description">
              Build a fire meter and raise sound pitch with correct streaks. No
              XP multiplier.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Combo feedback"
            checked={preferences.comboFeedback}
            onChange={(event) =>
              setPreference("comboFeedback", event.currentTarget.checked)
            }
          />
        </label>
        <label className="preference-row">
          <span className="preference-label">Typing sound</span>
          <select
            className="preference-select"
            value={preferences.soundStyle}
            onChange={(event) => {
              if (isSoundStyle(event.currentTarget.value)) {
                stopTypingSounds();
                setPreference("soundStyle", event.currentTarget.value);
              }
            }}
          >
            <option value="off">Off</option>
            <option value="standard">Standard</option>
            <option value="bitcrush">8-bit crush</option>
          </select>
        </label>
        <PreferenceSlider
          label="Sound volume"
          min={0}
          max={100}
          step={5}
          value={preferences.soundVolume}
          valueText={`${preferences.soundVolume}%`}
          onChange={(value) => {
            stopTypingSounds();
            setPreference("soundVolume", value);
          }}
        />
        <button
          className="restart-button sound-preview"
          disabled={
            preferences.soundStyle === "off" || preferences.soundVolume === 0
          }
          onClick={() =>
            playTypingSound(preferences.soundStyle, preferences.soundVolume)
          }
        >
          Preview sound
        </button>
        {audioStatus && (
          <p className="settings-storage-note" role="status">
            {audioStatus}
          </p>
        )}
        <label className="preference-row">
          <span className="preference-label">Typing particles</span>
          <select
            className="preference-select"
            value={preferences.particleStyle}
            onChange={(event) => {
              if (isParticleStyle(event.currentTarget.value))
                setPreference("particleStyle", event.currentTarget.value);
            }}
          >
            <option value="off">Off</option>
            <option value="regular">Regular</option>
            <option value="pixel">8-bit pixels</option>
          </select>
        </label>
        <p className="settings-note">
          Particles appear on correct characters and stay off when reduced
          motion is enabled.
        </p>
      </fieldset>
    </>
  );
}
