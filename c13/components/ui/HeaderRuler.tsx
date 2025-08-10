"use client";

import React from "react";
import Image from "next/image";

interface HeaderRulerProps {
  logoSrc?: string;
  logoAlt?: string;
}

export const HeaderRuler: React.FC<HeaderRulerProps> = ({
  logoSrc = "/logo.svg",
  logoAlt = "CSX Labs",
}) => {
  return (
    <div
      className="fixed z-40 bg-neutral-950 border-b border-neutral-400 h-8"
      style={{ top: "32px", left: "32px", right: "32px" }}
    >
      <div className="flex items-center justify-between px-4 h-full">
        <div className="flex items-center gap-3">
          <Image src={logoSrc} alt={logoAlt} width={64} height={16} />
        </div>
        <div className="text-[10px] font-mono text-neutral-300">
          Lung cancer metastases analysis using hyperpolarized 2-[13_C] pyrubate as the contrast agent
        </div>
      </div>
    </div>
  );
};

export default HeaderRuler;


