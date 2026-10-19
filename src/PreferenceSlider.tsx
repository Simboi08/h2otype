export default function PreferenceSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  valueText,
  onChange,
  endpoints,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  onChange: (value: number) => void;
  endpoints?: [string, string];
}) {
  const id = `slider-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="preference-range">
      <div className="range-heading">
        <label className="preference-label" htmlFor={id}>
          {label}
        </label>
        <output htmlFor={id} aria-live="off">
          {valueText}
        </output>
      </div>
      {description && (
        <p className="preference-description" id={`${id}-description`}>
          {description}
        </p>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        aria-describedby={description ? `${id}-description` : undefined}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      {endpoints && (
        <div className="range-endpoints" aria-hidden="true">
          <span>{endpoints[0]}</span>
          <span>{endpoints[1]}</span>
        </div>
      )}
    </div>
  );
}
