import PreferenceSlider from "./PreferenceSlider";
import {
  isParticleStyle,
  isSoundStyle,
  isTypingFont,
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
        <legend>Typing feedback</legend>
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
