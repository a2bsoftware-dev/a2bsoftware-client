"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_BASE_URL } from "@/lib/api";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Could not start the sign-in request. Please try again.",
  OAuthCallback: "Sign-in with Keycloak failed. Please try again.",
  AccessDenied: "Access denied. Your account may not have permission to sign in.",
  Default: "Something went wrong while signing in. Please try again.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleSignIn = () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`;
  };

  useEffect(() => {
    // Skip the auto-redirect when we just bounced back with an error —
    // otherwise a failed sign-in would loop straight back to Keycloak.
    if (!error) {
      handleSignIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing to show on the happy path — the effect above redirects to
  // Keycloak immediately, so no login UI should ever be visible.
  if (!error) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <span className="mx-auto text-xl font-bold bg-gradient-to-r from-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-200 dark:to-zinc-50">
          A2B SURVEY
        </span>
        <CardTitle className="mt-2">Sign-in didn&apos;t complete</CardTitle>
        <CardDescription>You can try signing in again.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}
          </AlertDescription>
        </Alert>
        <Button onClick={handleSignIn} className="w-full">
          <KeyRound />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
