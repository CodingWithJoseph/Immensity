import Hero from "@/app/(landing)/home/Hero";
import StatsBreakSection from "@/app/(landing)/home/StatsBreak";
import Works from "@/app/(landing)/home/Works";
import WhoFor from "@/app/(landing)/home/WhoFor";
import Features from "@/app/(landing)/home/Features";
import Pricing from "@/app/(landing)/home/Pricing";
import CTA from "@/app/(landing)/home/CTA";
import { getHomepageStats } from "@/lib/homepageStats";

export default async function HomePage() {
  const stats = await getHomepageStats();

  return (
      <main>
          <Hero />
          <StatsBreakSection stats={stats} />
          <Works />
          <WhoFor />
          <Features />
          <Pricing />
          <CTA />
      </main>
  );
}
