import Link from "next/link";
import { Building2, BedDouble, Users, IndianRupee, FileText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingNav } from "@/features/marketing/landing-nav";
import { StatCard } from "@/components/ui/stat-card";
import { AwaaslyLogo } from "@/components/brand/awaasly-logo";

const features = [
  { title: "Multi-Property Management", text: "See every PG and hostel from one account.", icon: Building2 },
  { title: "Rooms & Beds", text: "Understand occupancy and vacancy quickly.", icon: BedDouble },
  { title: "Residents", text: "Manage resident profiles and stay information.", icon: Users },
  { title: "Rent & Payments", text: "Track collections and pending dues.", icon: IndianRupee },
  { title: "Documents", text: "Keep resident records organized.", icon: FileText },
  { title: "Owner Dashboard", text: "Know what requires attention across properties.", icon: LayoutDashboard },
];

const problems = [
  "Paper registers",
  "Spreadsheets",
  "WhatsApp groups",
  "Manual rent records",
  "Calls between managers",
  "Scattered documents",
];

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <p className="border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
        Product preview — illustration of the Awaasly workspace, not live account data
      </p>
      <div className="grid min-h-[280px] md:grid-cols-[180px_1fr]">
        <div className="hidden bg-sidebar p-4 md:block">
          <AwaaslyLogo variant="reversed" size="sm" />
          <div className="mt-6 space-y-1 text-xs">
            {["Overview", "Properties", "Residents", "Rent & Payments"].map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-3 py-2 ${i === 0 ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70"}`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm font-semibold">What&apos;s happening across your properties</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard title="Properties" value="3" icon={Building2} compact />
            <StatCard title="Occupancy" value="88%" subtitle="42 occupied / 6 vacant" icon={BedDouble} compact />
            <StatCard title="Residents" value="42" icon={Users} compact />
            <StatCard title="Pending Rent" value="₹68,506" icon={IndianRupee} tone="danger" compact />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ showDashboard }: { showDashboard: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav showDashboard={showDashboard} />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <p className="text-sm font-medium text-muted-foreground">PG & Hostel Operations Platform</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Run all your PGs from one place.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">
          Awaasly helps PG and hostel operators manage properties, rooms, residents and collections through one simple operating platform.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {showDashboard ? (
            <Button asChild size="lg"><Link href="/dashboard">Open Dashboard</Link></Button>
          ) : (
            <Button asChild size="lg"><Link href="/signup">Start Free</Link></Button>
          )}
          <Button asChild size="lg" variant="outline"><Link href="/demo">Explore Demo</Link></Button>
        </div>
        <div className="mt-12">
          <ProductPreview />
        </div>
      </section>

      <section className="border-t py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold leading-7">Still managing your PG with</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((item) => (
              <li key={item} className="rounded-lg border bg-card px-4 py-3 text-sm">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm leading-[22px] text-muted-foreground">
            Awaasly brings that work into one place so you always know who is staying where, and what rent is due.
          </p>
        </div>
      </section>

      <section id="features" className="border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold leading-7">Built for how PGs actually run</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <item.icon className="h-5 w-5 text-foreground" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-[22px] text-muted-foreground">{item.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold leading-7">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Create your account",
              "Add your property",
              "Configure rooms and beds",
              "Add residents",
              "Start managing",
            ].map((step, i) => (
              <li key={step} className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{i + 1}</p>
                <p className="mt-2 text-sm font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold leading-7">Explore Awaasly before signing up.</h2>
          <p className="mt-3 text-sm leading-[22px] text-muted-foreground">
            Explore Awaasly with sample PG data. No password sharing.
          </p>
          <Button asChild className="mt-6"><Link href="/demo">Explore Live Demo</Link></Button>
        </div>
      </section>

      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold leading-7">Pricing</h2>
          <Card className="mt-6 max-w-md">
            <CardHeader>
              <CardTitle>Founding Partner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-[22px] text-muted-foreground">
                Start with a free pilot. Set up your properties and run daily operations while we grow Awaasly with early operators.
              </p>
              <Button asChild className="w-full">
                <Link href={showDashboard ? "/dashboard" : "/signup"}>
                  {showDashboard ? "Open Dashboard" : "Start Free"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Awaasly · Every property. One place. · Ramatech Innovation Pvt Ltd
      </footer>
    </div>
  );
}
