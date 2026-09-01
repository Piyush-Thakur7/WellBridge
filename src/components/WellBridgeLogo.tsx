import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const WellBridgeLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bridge Arch */}
      <path
        d="M6 38 C14 22, 34 22, 42 38"
        stroke="#0D9488"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Bridge Lower Support Arc */}
      <path
        d="M10 40 C17 30, 31 30, 38 40"
        stroke="#0D9488"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.4"
        fill="none"
      />
      {/* ECG Heartbeat Pulse Line intersecting apex */}
      <path
        d="M12 24 L19 24 L22 14 L25 32 L28 21 L31 26 L36 26"
        stroke="#0D9488"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle pulse glowing center dot */}
      <circle cx="25" cy="32" r="2" fill="#0D9488" />
    </svg>
  );
};
