import { Label } from "@/components/ui/label";
import { stateSelectOptions } from "@/lib/india/states";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function StateSelect({
  id = "state",
  name = "state",
  label = "State",
  required = false,
  currentStored,
  defaultValue,
  value,
  onChange,
  allowEmpty = !required,
}: {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  /** Stored DB value; legacy entries appear only for this edit row. */
  currentStored?: string | null;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  allowEmpty?: boolean;
}) {
  const options = stateSelectOptions(currentStored);
  const selectValue = value !== undefined ? value : defaultValue ?? "";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <select
        id={id}
        name={name}
        required={required}
        className={selectClassName}
        value={value !== undefined ? value : undefined}
        defaultValue={value === undefined ? selectValue : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        {allowEmpty ? (
          <option value="">{required ? "Select state / UT" : "Select state / UT (optional)"}</option>
        ) : null}
        {options.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
    </div>
  );
}
