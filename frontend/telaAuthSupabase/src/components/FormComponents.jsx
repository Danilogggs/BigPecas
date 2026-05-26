

export function FormField({ label, error, children, required = false }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && '*'}
      </label>
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export function FormInput({
  name,
  type = 'text',
  value,
  onChange,
  error,
  label,
  required = false,
  ...props
}) {
  return (
    <FormField label={label} error={error} required={required}>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`form-input ${error ? 'error' : ''}`}
        {...props}
      />
    </FormField>
  );
}

export function FormSelect({
  name,
  value,
  onChange,
  error,
  label,
  required = false,
  options = [],
  placeholder = 'Selecione uma opção',
  ...props
}) {
  return (
    <FormField label={label} error={error} required={required}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`form-select ${error ? 'error' : ''}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nome_categoria || option.nome_material}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function FormTextarea({
  name,
  value,
  onChange,
  error,
  label,
  required = false,
  rows = 3,
  ...props
}) {
  return (
    <FormField label={label} error={error} required={required}>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className={`form-textarea ${error ? 'error' : ''}`}
        {...props}
      />
    </FormField>
  );
}
