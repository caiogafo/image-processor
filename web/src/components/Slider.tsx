interface Props {
  label: string
  icon: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

export function Slider({ label, icon, value, min, max, step, onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-white/50 flex items-center gap-1.5">
          <span>{icon}</span>{label}
        </span>
        <span className="text-xs font-mono text-violet-400 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
          }}
        />
      </div>
    </div>
  )
}
