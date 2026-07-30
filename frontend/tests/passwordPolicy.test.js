import { validatePassword } from '../src/validators/passwordPolicy';

describe('validatePassword (frontend)', () => {
  it('accepts a strong password', () => {
    const result = validatePassword('Str0ng!Passw0rd');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a password missing a special character', () => {
    const result = validatePassword('Str0ngPassword');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must include a special character');
  });

  it('rejects an empty password', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
  });
});
