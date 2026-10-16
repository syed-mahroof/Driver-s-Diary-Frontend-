export function filterParams(filters) {
  return Object.fromEntries(Object.entries(filters)
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
    .filter(([, value]) => value !== '' && value != null));
}

export function selectionValues(value) {
  return Array.isArray(value) ? value.map(String) : value ? String(value).split(',') : [];
}
