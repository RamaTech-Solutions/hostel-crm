import type { ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  BedDouble,
  Users,
  IndianRupee,
  FileText,
  LayoutDashboard,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingNav } from "@/features/marketing/landing-nav";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { AwaaslyLogo } from "@/components/brand/awaasly-logo";
import { getDemoHref, getPublicSignupHref } from "@/lib/app-url";

const features = [
  {
    title: "Every PG in one place",
    text: "See occupancy, residents and rent across every property you operate — without switching registers.",
    icon: Building2,
  },
  {
    title: "Know what is really available",
    text: "Tell occupied beds apart from notice-period beds and genuinely vacant inventory.",
    icon: BedDouble,
  },
  {
    title: "One record for every resident",
    text: "Keep stay details connected from move-in through notice and checkout.",
    icon: Users,
  },
  {
    title: "Know what's collected — and what's still due",
    text: "Track expected, collected and outstanding rent without reconciling chats and spreadsheets.",
    icon: IndianRupee,
  },
  {
    title: "Keep resident documents organized",
    text: "Store ID proofs and stay records with the resident they belong to.",
    icon: FileText,
  },
  {
    title: "See what needs attention",
    text: "Spot upcoming exits, pending rent and operational follow-ups from one owner view.",
    icon: LayoutDashboard,
  },
];

const pains = [
  {
    title: "Which beds are actually available?",
    text: "Know which beds are occupied, vacant or transitioning through notice without checking individual registers.",
  },
  {
    title: "Who is leaving soon?",
    text: "Understand notice-period residents separately from genuinely vacant inventory.",
  },
  {
    title: "Whose rent is still pending?",
    text: "See expected, collected and outstanding rent without reconciling spreadsheets and chats.",
  },
  {
    title: "Where is this resident's record?",
    text: "Keep resident details and operational information organized in one place.",
  },
  {
    title: "What's happening across my other properties?",
    text: "Give owners visibility across every PG from one dashboard.",
  },
];

const howSteps = [
  "Set up your first property",
  "Add rooms and beds",
  "Add or onboard residents",
  "Track daily operations",
  "See everything from the owner dashboard",
];

const lifecycleSteps = [
  "Onboard",
  "Assign Bed",
  "Manage Stay",
  "Track Rent",
  "Notice",
  "Checkout",
];

const faqs = [
  {
    q: "Who is Awaasly built for?",
    a: "Indian PG and hostel operators who need a clear view of residents, occupancy and rent — especially those running more than one property.",
  },
  {
    q: "Can I manage multiple PG properties?",
    a: "Yes. Awaasly is designed so an owner can manage multiple PG properties from one account.",
  },
  {
    q: "What happens when a resident gives notice?",
    a: "Notice-period residents stay visible as occupied inventory until checkout is completed, so you can tell upcoming availability apart from vacant beds.",
  },
  {
    q: "Can I track pending rent?",
    a: "Yes. You can see what's expected, what's been collected and what's still outstanding across residents and properties.",
  },
  {
    q: "Can I try Awaasly before setting up my PG?",
    a: "Yes. Explore Demo uses ready-to-use sample PG data so you can see how properties, rooms, residents and rent tracking work — no setup required.",
  },
  {
    q: "How is my PG data organized?",
    a: "Each property, room, bed and resident stays connected in one operating system, so records don't scatter across notebooks, sheets and chats.",
  },
];

function PreviewChrome({
  caption,
  activeNav = "Overview",
  children,
}: {
  caption: string;
  activeNav?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <p className="border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground">{caption}</p>
      <div className="grid min-h-[260px] md:grid-cols-[168px_1fr]">
        <div className="hidden bg-sidebar p-4 md:block">
          <AwaaslyLogo variant="reversed" placement="preview" />
          <div className="mt-6 space-y-1 text-xs">
            {["Overview", "Properties", "Rooms & Beds", "Residents", "Rent & Payments"].map((item) => (
              <div
                key={item}
                className={`rounded-md px-3 py-2 ${
                  item === activeNav ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <PreviewChrome caption="Live occupancy, resident status and pending rent at a glance.">
      <p className="text-sm font-semibold">What&apos;s happening across your properties</p>
      <div className="grid grid-cols-2 gap-2">
        <StatCard title="Properties" value="3" icon={Building2} compact />
        <StatCard title="Occupancy" value="88%" subtitle="42 occupied · 6 vacant" icon={BedDouble} compact />
        <StatCard title="Residents" value="42" icon={Users} compact />
        <StatCard title="Pending Rent" value="₹68,506" icon={IndianRupee} tone="danger" compact />
      </div>
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="h-3.5 w-3.5 text-warning" />
          Needs attention
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>3 residents on notice period</li>
          <li>8 rent payments still outstanding</li>
        </ul>
      </div>
    </PreviewChrome>
  );
}

function OccupancyPreview() {
  const beds = [
    { room: "101", bed: "A", state: "Occupied", variant: "success" as const },
    { room: "101", bed: "B", state: "On notice", variant: "warning" as const },
    { room: "102", bed: "A", state: "Vacant", variant: "secondary" as const },
    { room: "102", bed: "B", state: "Occupied", variant: "success" as const },
  ];

  return (
    <PreviewChrome caption="Occupied is not the same as notice. Notice is not the same as vacant." activeNav="Rooms & Beds">
      <p className="text-sm font-semibold">Rooms & Beds</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {beds.map((bed) => (
          <div key={`${bed.room}-${bed.bed}`} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">
                Room {bed.room} · Bed {bed.bed}
              </p>
              <p className="text-xs text-muted-foreground">Inventory state</p>
            </div>
            <Badge variant={bed.variant}>{bed.state}</Badge>
          </div>
        ))}
      </div>
    </PreviewChrome>
  );
}

function ResidentPreview() {
  return (
    <PreviewChrome caption="One resident record connected through the full stay." activeNav="Residents">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Priya Sharma</p>
          <p className="text-xs text-muted-foreground">Green Valley PG · Room 101 · Bed B</p>
        </div>
        <Badge variant="warning">Notice Period</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border px-3 py-2">
          <p className="text-muted-foreground">Move-in</p>
          <p className="mt-1 font-medium">12 Jan 2026</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-muted-foreground">Checkout planned</p>
          <p className="mt-1 font-medium">28 Aug 2026</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-muted-foreground">Monthly rent</p>
          <p className="mt-1 font-medium">₹8,500</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-muted-foreground">Outstanding</p>
          <p className="mt-1 font-medium text-destructive">₹2,000</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lifecycleSteps.map((step, i) => (
          <span
            key={step}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              i <= 4 ? "border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground"
            }`}
          >
            {step}
          </span>
        ))}
      </div>
    </PreviewChrome>
  );
}

function RentPreview() {
  return (
    <PreviewChrome caption="Expected, collected and outstanding — without reconciling chats." activeNav="Rent & Payments">
      <p className="text-sm font-semibold">Rent this month</p>
      <div className="grid grid-cols-3 gap-2">
        <StatCard title="Expected" value="₹3.2L" icon={IndianRupee} compact />
        <StatCard title="Collected" value="₹2.5L" icon={IndianRupee} tone="success" compact />
        <StatCard title="Outstanding" value="₹68.5K" icon={IndianRupee} tone="danger" compact />
      </div>
      <div className="space-y-2">
        {[
          { name: "Aman Verma", amount: "₹8,500", status: "Pending" as const },
          { name: "Neha Patel", amount: "₹7,500", status: "Partial" as const },
          { name: "Rahul Mehta", amount: "₹9,000", status: "Overdue" as const },
        ].map((row) => (
          <div key={row.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span>{row.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{row.amount}</span>
              <Badge variant={row.status === "Overdue" ? "destructive" : "warning"}>{row.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </PreviewChrome>
  );
}

function PrimaryCtas({ showDashboard }: { showDashboard: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {showDashboard ? (
        <Button asChild size="lg">
          <Link href="/dashboard">Open Dashboard</Link>
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link href={getPublicSignupHref()}>Start Free</Link>
        </Button>
      )}
      <Button asChild size="lg" variant="outline">
        <Link href={getDemoHref()}>Explore Demo</Link>
      </Button>
    </div>
  );
}

function StorySection({
  id,
  eyebrow,
  title,
  support,
  children,
  reverse = false,
  muted = false,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  support: string;
  children: ReactNode;
  reverse?: boolean;
  muted?: boolean;
}) {
  return (
    <section id={id} className={`border-t py-16 sm:py-20 ${muted ? "bg-muted/40" : ""}`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className={`grid items-center gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div>
            {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{support}</p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage({ showDashboard }: { showDashboard: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav showDashboard={showDashboard} />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <p className="text-sm font-medium text-muted-foreground">PG Management Software for India</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Run every PG from one place.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">
          Manage residents, occupancy, rooms, beds and rent across all your properties — without scattered
          registers, spreadsheets or WhatsApp follow-ups.
        </p>
        <div className="mt-8">
          <PrimaryCtas showDashboard={showDashboard} />
        </div>
        <div className="mt-12">
          <DashboardPreview />
        </div>
      </section>

      <section className="border-t bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Running multiple PGs shouldn&apos;t mean managing multiple registers.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pains.map((pain) => (
              <div key={pain.title} className="rounded-xl border bg-card p-5">
                <h3 className="text-base font-semibold leading-6">{pain.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{pain.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StorySection
        title="See every property without calling every manager."
        support="Get one view of occupancy, residents, upcoming exits, expected rent, collected rent and outstanding amounts across your PG business."
      >
        <DashboardPreview />
      </StorySection>

      <StorySection
        muted
        reverse
        title="Know what's occupied, what's vacant and what's becoming available."
        support="See occupied beds, vacant beds and notice-period stays clearly — so upcoming availability is not confused with empty inventory."
      >
        <OccupancyPreview />
      </StorySection>

      <StorySection
        title="One resident record from move-in to move-out."
        support="Resident information stays connected through the full stay lifecycle — from onboarding and bed assignment to rent, notice and checkout."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {lifecycleSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium">{step}</span>
                {i < lifecycleSteps.length - 1 ? (
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <ResidentPreview />
        </div>
      </StorySection>

      <StorySection
        muted
        reverse
        title="Stop figuring out collections from chats and spreadsheets."
        support="See what's expected, what's been collected and what's still outstanding across residents and properties — without turning Awaasly into accounting software."
      >
        <RentPreview />
      </StorySection>

      <section className="border-t py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One owner view. Every PG.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Awaasly is designed so growing operators can manage multiple PG properties from one account — and keep
            the brand promise simple: run every PG from one place.
          </p>
          <div className="mt-10 overflow-hidden rounded-xl border bg-card">
            <div className="border-b bg-muted/40 px-4 py-3 text-sm font-medium">Owner</div>
            <div className="grid gap-px bg-border sm:grid-cols-4">
              {["Green Valley PG", "Lakeview Hostel", "City Nest PG", "Your next property"].map((name, i) => (
                <div key={name} className="bg-card px-4 py-5">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i < 3 ? "Occupancy · Residents · Rent" : "Ready when you expand"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for day-to-day PG operations</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            The product story above is the point. These are the working pieces that support it.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <item.icon className="h-5 w-5 text-foreground" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">{item.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How Awaasly works</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Set up your first property in one afternoon.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {howSteps.map((step, i) => (
              <li key={step} className="rounded-xl border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">{i + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-6">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">See Awaasly before setting up anything.</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Explore Awaasly using ready-to-use sample PG data and see how properties, rooms, residents and rent
            tracking work.
          </p>
          <p className="mt-2 text-sm font-medium">No setup required.</p>
          <Button asChild className="mt-6" size="lg">
            <Link href={getDemoHref()}>Explore Demo</Link>
          </Button>
        </div>
      </section>

      <section id="pricing" className="border-t py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Founding Partner Pilot</h2>
          <Card className="mt-8 max-w-lg">
            <CardHeader>
              <CardTitle className="text-xl">Try Awaasly with your PG during our early-access pilot.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                <li>No card required</li>
                <li>Built for Indian PG and hostel operators</li>
                <li>Set up properties, manage rooms and beds, add residents, and run daily operations</li>
              </ul>
              <Button asChild className="w-full" size="lg">
                <Link href={showDashboard ? "/dashboard" : getPublicSignupHref()}>
                  {showDashboard ? "Open Dashboard" : "Start Free"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="faq" className="border-t bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-8 max-w-3xl space-y-3">
            {faqs.map((item) => (
              <details key={item.q} className="group rounded-xl border bg-card px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold leading-6 marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to move your PG beyond registers and spreadsheets?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Start with Awaasly or explore a working PG using sample data.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryCtas showDashboard={showDashboard} />
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="flex justify-center">
          <AwaaslyLogo variant="primaryTagline" placement="footer" />
        </div>
        <p className="mt-3">Awaasly is a product by Ramatech Innovation Pvt Ltd.</p>
      </footer>
    </div>
  );
}
