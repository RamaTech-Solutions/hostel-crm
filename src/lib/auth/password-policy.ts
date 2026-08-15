export type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
  valid: boolean;
};

const SYMBOL = /[^A-Za-z0-9\s]/;

export function validatePassword(password: string): PasswordChecks {
  const minLength = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const symbol = SYMBOL.test(password);
  return {
    minLength,
    uppercase,
    lowercase,
    number,
    symbol,
    valid: minLength && uppercase && lowercase && number && symbol,
  };
}

export const PASSWORD_POLICY_MESSAGE =
  "Choose a stronger password that meets all the requirements below.";
