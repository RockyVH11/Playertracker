import { YOUTH_AGE_GROUPS } from "@/lib/data/age-groups";

type Props = {
  name: string;
  id?: string;
  className?: string;
  required?: boolean;
  defaultValue?: string;
  /** Renders a first option with value="" (e.g. "All" or "Use chart") */
  emptyLabel?: string;
};

export function AgeGroupSelect({
  name,
  id,
  className,
  required,
  defaultValue,
  emptyLabel,
}: Props) {
  const dv = defaultValue?.trim() ?? "";
  const list = YOUTH_AGE_GROUPS as readonly string[];
  const legacy = dv.length > 0 && !list.includes(dv);

  return (
    <select
      id={id}
      name={name}
      required={required}
      className={className}
      defaultValue={dv}
    >
      {emptyLabel != null ? <option value="">{emptyLabel}</option> : null}
      {legacy ? (
        <option value={dv}>
          {dv} (update to standard)
        </option>
      ) : null}
      {list.map((ag) => (
        <option key={ag} value={ag}>
          {ag}
        </option>
      ))}
    </select>
  );
}
