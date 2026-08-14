import { AuthShell } from "@/components/brand/auth-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell showTagline>{children}</AuthShell>;
}
