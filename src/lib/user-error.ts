export function toUserError(message: string | undefined | null, fallback = "Something went wrong. Please try again.") {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return fallback;
  if (raw.includes("already registered") || raw.includes("already been registered") || raw.includes("user already")) {
    return "An account with this email already exists. Try logging in.";
  }
  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the link.";
  }
  if (raw.includes("password") && (raw.includes("weak") || raw.includes("least") || raw.includes("short"))) {
    return "Choose a stronger password (at least 8 characters).";
  }
  if (raw.includes("row-level security") || raw.includes("rls")) {
    return "You don't have permission to save that. Refresh and try again.";
  }
  if (raw.includes("expired") || raw.includes("otp") || raw.includes("invalid") && raw.includes("link")) {
    return "That confirmation link is invalid or has expired. Request a new one from signup.";
  }
  if (raw.includes("rate") || raw.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (raw.includes("network") || raw.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (raw.length > 140 || raw.includes("violates") || raw.includes("postgres") || raw.includes("pgrst")) {
    return fallback;
  }
  return message ?? fallback;
}
