"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
};

const CardShell: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div
    className={cn(
      "w-full max-w-md rounded-none bg-card p-6 shadow-input md:rounded-2xl md:p-8",
      "text-card-foreground border border-border",
      className,
    )}
    role="region"
  >
    {children}
  </div>
);

const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children, className, fullScreen = true }) => {
  const content = (
    <CardShell className={className}>
      <div className="mb-6">
        <div className="mb-2 text-xs font-medium text-muted-foreground" aria-label="Brand">
          a8n
        </div>
        <h1 className="text-xl font-semibold leading-tight" aria-label={title}>{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </CardShell>
  );

  if (!fullScreen) return content;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      {content}
    </div>
  );
};

export default AuthCard;
