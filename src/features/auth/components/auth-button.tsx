import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
};

export function AuthButton({
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <Button
      className={cn(
        "h-11 w-full rounded-lg bg-brand text-sm font-bold text-brand-foreground shadow-sm hover:bg-brand/90",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {loading ? (loadingText ?? children) : children}
    </Button>
  );
}
