"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
