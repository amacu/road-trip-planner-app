import Link from "next/link";

export default function TripNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Trip not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This trip doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:opacity-90"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
