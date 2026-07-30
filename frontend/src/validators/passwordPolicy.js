const MIN_LENGTH = 10;

const RULES = [
  { test: (p) => p.length >= MIN_LENGTH, message: `Password must be at least ${MIN_LENGTH} characters` },
  { test: (p) => /[a-z]/.test(p), message: 'Password must include a lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must include an uppercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'Password must include a digit' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'Password must include a special character' },
  { test: (p) => !/\s/.test(p), message: 'Password must not contain whitespace' },
];

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, errors: ['Password is required'] };
  }
  const errors = RULES.filter((r) => !r.test(password)).map((r) => r.message);
  return { valid: errors.length === 0, errors };
}
