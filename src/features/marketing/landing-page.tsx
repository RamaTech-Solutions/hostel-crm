import Link from "next/link";
import { Building2, BedDouble, Users, IndianRupee, FileText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingNav } from "@/features/marketing/landing-nav";

const features = [
  { title: "Multi-Property Management", text: "Manage multiple PG and hostel properties from one account.", icon: Building2 },
  { title: "Rooms & Beds", text: "Know which beds are occupied and which are vacant.", icon: BedDouble },
  { title: "Residents", text: "Keep resident information and stay history in one place.", icon: Users },
  { title: "Rent & Payments", text: "Track rent collection and outstanding dues.", icon: IndianRupee },
  { title: "Documents", text: "Store resident records and documents securely.", icon: FileText },
  { title: "Owner Dashboard", text: "See occupancy, collections and activity across properties.", icon: LayoutDashboard },
];

export function LandingPage({ showDashboard }: { showDashboard: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav showDashboard={showDashboard} />

      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <p className="text-sm font-medium text-primary">Awaasly</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Run all your PGs from one place.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Manage properties, rooms, beds, residents, rent and daily PG operations from one simple dashboard.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {showDashboard ? (
            <Button asChild size="lg"><Link href="/dashboard">Open Dashboard</Link></Button>
          ) : (
            <Button asChild size="lg"><Link href="/signup">Start Free</Link></Button>
          )}
          <Button asChild size="lg" variant="outline"><Link href="/demo">Explore Demo</Link></Button>
        </div>
      </section>

      <section id="features" className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Built for how PGs actually run</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Many operators still juggle paper registers, Excel sheets, WhatsApp groups, UPI screenshots,
            handwritten room lists, and different managers at different properties. Awaasly brings that
            work into one place so you always know who is staying where, and what rent is due.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <item.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Create your account",
              "Add your first property",
              "Configure rooms and beds",
              "Add residents",
              "Start managing your PG",
            ].map((step, i) => (
              <li key={step} className="rounded-lg border p-4">
                <p className="text-sm font-medium text-primary">{i + 1}</p>
                <p className="mt-2 text-sm font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Explore Awaasly before signing up.</h2>
          <p className="mt-3 text-muted-foreground">
            Open a live demo with sample properties, residents and payments. No password sharing.
          </p>
          <Button asChild className="mt-6"><Link href="/demo">Explore Live Demo</Link></Button>
        </div>
      </section>

      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <Card className="mt-6 max-w-md">
            <CardHeader>
              <CardTitle>Founding Partner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Start with a free pilot. Set up your properties and run daily operations while we grow Awaasly with early operators.
              </p>
              <Button asChild className="w-full">
                <Link href={showDashboard ? "/dashboard" : "/signup"}>
                  {showDashboard ? "Open Dashboard" : "Join Founding Pilot"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Awaasly · Ramatech Innovation Pvt Ltd
      </footer>
    </div>
  );
}
