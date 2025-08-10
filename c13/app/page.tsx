"use client";

import React from "react";
import C3Layout from "../components/layouts/C3Layout";
import Image from "next/image";

function useCarousel<T>(items: T[], intervalMs: number) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs]);
  return items[index % (items.length || 1)] as T | undefined;
}

export default function Home() {
  const [uploaded, setUploaded] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<string>("");
  const [evolutions, setEvolutions] = React.useState<string[]>([]);

  const currentEvolution = useCarousel(evolutions, 2500);

  const handleDrop = React.useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUploaded(objectUrl);
    // Fake model responses for hackathon demo
    setAnalysis(
      "Detected probable metastases in hepatic segment IVa and right adrenal region. Tumor burden estimate: moderate. Recommend PET-CT correlation and biopsy planning."
    );
    setEvolutions([
      "/site-thumbnails/sam-altman-iit-interview.png",
      "/products/riff.webp",
      "/team/adam.jpeg",
    ]);
  }, []);

  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <C3Layout topNews={[]} rightNews={[]} leftNews={[]} bottomNews={[]}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
        <div className="flex flex-col gap-8 overflow-hidden">
          <div
            onDragEnter={preventDefaults}
            onDragOver={preventDefaults}
            onDrop={handleDrop}
            className="border border-neutral-400 bg-neutral-900/30 overflow-hidden h-64 flex items-center justify-center cursor-pointer"
            title="Drag and drop MRI image here"
          >
            {uploaded ? (
              <div className="relative w-full h-full">
                <Image src={uploaded} alt="MRI" fill className="object-contain" />
              </div>
            ) : (
              <div className="text-xs text-neutral-300 font-mono">DRAG & DROP MRI IMAGE (C13-PYRUVATE)</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8 overflow-hidden">
          <div className="border border-neutral-400 bg-neutral-900/30 h-64 overflow-hidden">
            <div className="h-8 border-b border-neutral-500 px-3 flex items-center text-xs font-mono text-neutral-200">
              TUMOR EVOLUTION (AUTO-CYCLE)
            </div>
            <div className="relative h-[calc(100%-2rem)]">
              {currentEvolution ? (
                <Image src={currentEvolution} alt="Evolution" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-neutral-300 font-mono">
                  AWAITING UPLOAD
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 border border-neutral-400 bg-neutral-900/30 min-h-48 max-h-[40vh] overflow-hidden">
          <div className="h-8 border-b border-neutral-500 px-3 flex items-center text-xs font-mono text-neutral-200">
            ANALYSIS
          </div>
          <div className="p-4 h-[calc(100%-2rem)] overflow-auto">
            <p className="text-xs text-neutral-50 leading-relaxed whitespace-pre-wrap">
              {analysis || "Upload an MRI image to generate analysis."}
            </p>
          </div>
        </div>
      </div>
    </C3Layout>
  );
}
