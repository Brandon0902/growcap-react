export function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
