export function toUserError(message: string | undefined | null, fallback = "Something went wrong. Please try again.") {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return fallback;
  if (raw.includes("authapierror") || raw.includes("invalid_grant") || raw.includes("weakpassword")) {
    if (raw.includes("weak") || raw.includes("password")) {
      return "Your password doesn't meet Awaasly's password requirements.";
    }
    return fallback;
  }
  if (raw.includes("already registered") || raw.includes("already been registered") || raw.includes("user already")) {
    return "An account with this email already exists. Try logging in.";
  }
  if (raw.includes("invalid login") || raw.includes("invalid credentials") || raw.includes("invalid email or password")) {
    return "The email or password is incorrect.";
  }
  if (raw.includes("email not confirmed") || (raw.includes("not confirmed") && raw.includes("email"))) {
    return "Please confirm your email before signing in.";
  }
  if (raw.includes("password") && (raw.includes("weak") || raw.includes("least") || raw.includes("short") || raw.includes("pwned"))) {
    return "Your password doesn't meet Awaasly's password requirements.";
  }
  if (raw.includes("row-level security") || raw.includes("rls")) {
    return "You don't have permission to save that. Refresh and try again.";
  }
  if (raw.includes("expired") || ((raw.includes("otp") || raw.includes("token")) && raw.includes("invalid")) || (raw.includes("invalid") && raw.includes("link"))) {
    return "This reset link has expired. Request a new one.";
  }
  if (
    raw.includes("rate") ||
    raw.includes("too many") ||
    raw.includes("over_email_send_rate_limit") ||
    raw.includes("security purposes") ||
    (raw.includes("only request") && raw.includes("seconds"))
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (raw.includes("network") || raw.includes("fetch failed") || raw.includes("failed to fetch")) {
    return "We couldn't reach Awaasly. Check your connection and try again.";
  }
  if (
    raw.length > 140 ||
    raw.includes("violates") ||
    raw.includes("postgres") ||
    raw.includes("pgrst") ||
    raw.includes("jwt") ||
    raw.includes("stack")
  ) {
    return fallback;
  }
  return fallback;
}
