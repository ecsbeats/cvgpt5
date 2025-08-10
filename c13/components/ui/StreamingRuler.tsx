"use client";

import React from "react";
import Link from "next/link";

interface StreamingRulerProps {
  position: "top" | "bottom" | "left" | "right";
  news: Array<{ text: string; link: string }>;
  disabled?: boolean;
  centerText?: string;
}

export const StreamingRuler: React.FC<StreamingRulerProps> = ({
  position,
  news,
  disabled = false,
  centerText,
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case "top":
        return "fixed top-0 left-0 right-0 z-50 bg-neutral-950 border-b border-neutral-400 h-8";
      case "bottom":
        return "fixed bottom-0 left-0 right-0 z-40 bg-neutral-950 border-t border-neutral-400 h-8";
      case "left":
        return "fixed left-0 top-8 bottom-8 w-8 bg-neutral-950 border-r border-neutral-400 z-30";
      case "right":
        return "fixed right-0 top-8 bottom-8 w-8 bg-neutral-950 border-l border-neutral-400 z-30";
      default:
        return "";
    }
  };

  const getContentLayout = () => {
    if ((position === "top" || position === "bottom") && centerText) {
      return (
        <div className="h-full w-full flex items-center justify-center">
          <div className={`text-[10px] tracking-widest font-mono ${disabled ? "text-neutral-500" : "text-neutral-50"}`}>
            {centerText}
          </div>
        </div>
      );
    }

    if (position === "left" || position === "right") {
      return (
        <div className="overflow-hidden h-full flex items-center justify-center">
          <div className={`flex flex-col whitespace-nowrap`}>
            {[...news, ...news].map((item, index) => (
              <Link
                key={index}
                href={item.link}
                className={`${
                  disabled ? "text-neutral-500" : "text-neutral-50"
                } text-xs font-mono my-4 ${
                  position === "left"
                    ? "[writing-mode:vertical-lr]"
                    : "[writing-mode:vertical-rl]"
                }`}
              >
                {item.text}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden h-full">
        <div className={`flex items-center h-full whitespace-nowrap`}>
          {[...news, ...news].map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className={`${
                disabled ? "text-neutral-500" : "text-neutral-50"
              } text-xs font-mono mx-4`}
            >
              {item.text}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return <div className={`${getPositionStyles()} group`}>{getContentLayout()}</div>;
};

export default StreamingRuler;


