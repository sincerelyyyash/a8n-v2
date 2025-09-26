"use client";

import React from "react";

type HeroProps = {
  children?: React.ReactNode;
  className?: string;
};

const Hero: React.FC<HeroProps> = ({ children, className }) => {
  return (
    <div className={`min-h-screen w-full relative ${className ?? ""}`}>
      {/* Azure Depths */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 100%, #000000 40%, #010133 100%)",
        }}
        aria-hidden="true"
      />
      {/* Your Content/Components */}
      <div className="relative z-10 text-foreground">
        {children}
      </div>
    </div>
  );
};

export default Hero;


