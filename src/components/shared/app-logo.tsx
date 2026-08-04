import Image from "next/image";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
};

export function AppLogo({ compact = false, className = "" }: AppLogoProps) {
  return (
    <div className={"flex items-center " + className}>
      {compact ? (
        <LogoMark className="size-11" />
      ) : (
        <Image
          src="/logo.png"
          alt="Tripzo"
          width={480}
          height={160}
          priority
          className="h-14 w-auto object-contain"
        />
      )}
    </div>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo-box.png?v=2"
      alt=""
      width={160}
      height={160}
      unoptimized
      aria-hidden="true"
      className={"block shrink-0 object-contain " + className}
    />
  );
}
