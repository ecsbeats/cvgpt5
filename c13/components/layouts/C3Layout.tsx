"use client";

import React from "react";
import { StreamingRuler } from "../ui/StreamingRuler";
import { HeaderRuler } from "../ui/HeaderRuler";

type NewsItem = { text: string; link: string };

interface C3LayoutProps {
  children: React.ReactNode;
  topNews?: NewsItem[];
  leftNews?: NewsItem[];
  rightNews?: NewsItem[];
  bottomNews?: NewsItem[];
  withFooter?: boolean;
  footerText?: string;
}

export const C3Layout: React.FC<C3LayoutProps> = ({
  children,
  topNews = [],
  leftNews = [],
  rightNews = [],
  bottomNews = [],
  withFooter = false,
  footerText = "© 2025 CSX LABS - ALL RIGHTS RESERVED",
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col overflow-hidden">
      <StreamingRuler position="top" news={topNews} disabled centerText="PROTECTED HEALTH INFORMATION" />
      <StreamingRuler position="left" news={leftNews} disabled />
      <StreamingRuler position="right" news={rightNews} disabled />
      <StreamingRuler position="bottom" news={bottomNews} disabled centerText="PROTECTED HEALTH INFORMATION" />

      <HeaderRuler />

      <div className="pt-20 pb-16 pl-12 pr-12 flex-1 overflow-hidden">
        <div className="max-w-full mx-auto h-full overflow-hidden">{children}</div>
      </div>

      {withFooter && (
        <div className="bg-neutral-950 border-t border-neutral-400 h-8 mx-8 mb-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-xs font-mono text-neutral-400">{footerText}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default C3Layout;


