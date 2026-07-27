type AppLogoProps = {
  compact?: boolean;
  className?: string;
};

export function AppLogo({ compact = false, className = "" }: AppLogoProps) {
  return (
    <div className={"flex items-center gap-3 " + className}>
      <LogoMark className={compact ? "size-11" : "size-14"} />
      {!compact && (
        <div className="leading-none">
          <div className="text-[26px] font-black tracking-tight text-foreground">
            Milepost
          </div>
          <div className="mt-1 text-[24px] font-medium tracking-tight text-brand">
            RoadTrip
          </div>
        </div>
      )}
    </div>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="14" cy="47" r="8" fill="#16130D" />
      <circle cx="50" cy="17" r="8" fill="#F3EDE1" />
      <path
        d="M14 47c14-15 25-17 22-27s10-12 14-3"
        stroke="var(--color-brand)"
        strokeDasharray="2 9"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
