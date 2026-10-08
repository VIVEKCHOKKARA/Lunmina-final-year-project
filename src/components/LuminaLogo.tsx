import React from "react";
import { Zap } from "lucide-react";

interface LuminaLogoProps {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export function LuminaLogo({
  size = 24,
  showText = true,
  textClassName = "text-xl font-bold tracking-tight text-white font-display",
  className = "flex items-center gap-2",
}: LuminaLogoProps) {
  return (
    <div className={className}>
      <Zap style={{ width: size, height: size }} className="text-primary shrink-0" />
      {showText && <span className={textClassName}>Lumina</span>}
    </div>
  );
}
