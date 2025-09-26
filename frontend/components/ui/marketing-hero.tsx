"use client";

import React from "react";
import Hero from "@/components/ui/hero";
import { Button } from "@/components/ui/button";

type MarketingHeroProps = {
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
};

const MarketingHero: React.FC<MarketingHeroProps> = ({
  onPrimaryClick,
  onSecondaryClick,
}) => {
  return (
    <Hero>
      <section className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
            Automate your workflows, visually
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/70">
            Design, connect, and run tasks in minutes. No heavy setup required.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button onClick={onPrimaryClick} className="px-6 h-11 text-base">
              Get started
            </Button>
            <Button
              onClick={onSecondaryClick}
              variant="outline"
              className="px-6 h-11 text-base"
            >
              Learn more
            </Button>
          </div>
        </div>
      </section>
    </Hero>
  );
};

export default MarketingHero;


