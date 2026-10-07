import type { Field } from '../features/administration/catalog';
import { positionPath, type FormValues, type MasterRecord } from '../domain/model';
export function Fields({
  fields,
  values,
  errors,
  positions,
  setValues,
  excluded,
}: {
  fields: Field[];
  values: FormValues;
  errors: Record<string, string>;
  positions: MasterRecord[];
  setValues: (values: FormValues) => void;
  excluded?: string;
}) {
  return (
    <>
      {fields.map((field) => {
        const id = `field-${field.key}`;
        const required =
          field.required ||
          (field.key === 'triage_position_id' &&
            Boolean(values.triage_on_create || values.triage_on_return));
        const common = {
          id,
          'aria-invalid': Boolean(errors[field.key]),
          'aria-describedby': errors[field.key] ? `${id}-error` : undefined,
        };
        const set = (value: string | boolean | null) =>
          setValues({ ...values, [field.key]: value });
        return (
          <div
            className={`field ${field.kind === 'checkbox' ? 'check-field' : ''}`}
            key={field.key}
          >
            {field.kind === 'checkbox' ? (
              <label htmlFor={id}>
                <input
                  {...common}
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(e) => set(e.target.checked)}
                />
                {field.label}
              </label>
            ) : (
              <>
                <label htmlFor={id}>
                  {field.label}
                  {required ? ' *' : ''}
                </label>
                {field.kind === 'position' ? (
                  <select
                    {...common}
                    value={String(values[field.key] || '')}
                    onChange={(e) => set(e.target.value || null)}
                  >
                    <option value="">
                      {field.key === 'parent_id' ? 'Raiz — sem posição pai' : 'Não definida'}
                    </option>
                    {positions
                      .filter((p) => p.active && p.id !== excluded)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {positionPath(p.id, positions)} · {p.code}
                        </option>
                      ))}
                  </select>
                ) : field.kind === 'textarea' ? (
                  <textarea
                    {...common}
                    rows={3}
                    maxLength={field.max}
                    value={String(values[field.key] || '')}
                    onChange={(e) => set(e.target.value)}
                  />
                ) : (
                  <input
                    {...common}
                    maxLength={field.max}
                    value={String(values[field.key] || '')}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </>
            )}
            {errors[field.key] && (
              <small className="field-error" id={`${id}-error`}>
                {errors[field.key]}
              </small>
            )}
          </div>
        );
      })}
    </>
  );
}
