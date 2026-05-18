import { useState } from "react";
import { Switch } from "../../components/ui/switch";

export function FormField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
      {description && <p className="text-xs text-[var(--text-tertiary)]">{description}</p>}
      {children}
    </div>
  );
}

export function ToggleField({
  label,
  description,
  defaultChecked,
  checked: controlledChecked,
  onChange,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  function handleCheckedChange(nextChecked: boolean) {
    if (onChange) onChange(nextChecked);
    else setInternalChecked(nextChecked);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={handleCheckedChange} aria-label={label} />
    </div>
  );
}
