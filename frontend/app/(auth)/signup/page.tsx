"use client";
import * as React from "react";
import AuthCard from "@/components/auth/AuthCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

const SignupPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const formData = new FormData(e.currentTarget);
      const payload = Object.fromEntries(formData.entries()) as any;
      const res = await apiClient.post("/api/v1/user/signup", payload, { withCredentials: true });
      if (res.status === 200) {
        toast.success("Account created");
        await refresh();
        router.replace("/workflows");
      } else {
        toast.error("Failed to create account");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create account";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 md:grid-cols-2">
      <div className="order-2 md:order-1">
        <h2 className="text-2xl font-semibold">Welcome to a8n</h2>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Automate your workflows with a clean, minimal interface. Create your account to get started.
        </p>
      </div>
      <div className="order-1 md:order-2 md:justify-self-end">
        <AuthCard title="Create your account" subtitle="Sign up to continue" fullScreen={false}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" name="first_name" placeholder="Jane" type="text" required aria-label="First name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" name="last_name" placeholder="Doe" type="text" required aria-label="Last name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" placeholder="you@example.com" type="email" required aria-label="Email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" placeholder="••••••••" type="password" required aria-label="Password" />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting} aria-label="Create account">
              {isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </AuthCard>
      </div>
    </div>
  );
};

export default SignupPage;
