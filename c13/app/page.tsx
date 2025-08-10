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
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<string>("");
  const [finalTitle, setFinalTitle] = React.useState<string>("");
  const [finalSummary, setFinalSummary] = React.useState<string>("");
  const [finalPrompts, setFinalPrompts] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [evolutions, setEvolutions] = React.useState<string[]>([]);

  const currentEvolution = useCarousel(evolutions, 2500);
  let promptsForGen: string[] | null = null;

  const handleDrop = React.useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUploaded(objectUrl);
    setIsLoading(true);
    setAnalysis("");
    setFinalTitle("");
    setFinalSummary("");
    setFinalPrompts([]);
    setEvolutions([]);

    // 1) Create job via upload
    const form = new FormData();
    form.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
    const { jobId } = (await uploadRes.json()) as { jobId: string };
    setJobId(jobId);

    // 2) Stream analysis (POST with inline image to avoid store races)
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const streamRes = await fetch(`/api/analysis/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, imageDataUrl: dataUrl }),
    });
    const reader = streamRes.body?.getReader();
    const decoder = new TextDecoder();
    if (reader) {
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.replace(/^data:\s*/, "");
          const payload = JSON.parse(json);
          if (payload.type === "token") {
            setAnalysis((a) => a + payload.content);
          } else if (payload.type === "final") {
            setFinalTitle(payload.title);
            setFinalSummary(payload.summary);
            setFinalPrompts(payload.prompts);
            promptsForGen = Array.isArray(payload.prompts) ? payload.prompts : null;
          }
        }
      }
    }

    // 3) Kick off image generations sequentially with backend delay
    const prompts = promptsForGen ?? [
      "placeholder prompt a",
      "placeholder prompt b",
      "placeholder prompt c",
    ];
    for (let i = 0; i < 3; i++) {
      const prompt = prompts[i] ?? prompts[0];
      const genRes = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, prompt, index: i }),
      });
      const { imageUrl } = (await genRes.json()) as { imageUrl: string };
      setEvolutions((arr) => {
        const next = [...arr];
        next[i] = imageUrl;
        return next;
      });
    }

    setIsLoading(false);
  }, []);

  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <C3Layout
      topNews={[]}
      rightNews={[]}
      leftNews={[]}
      bottomNews={[]}
      headerTitle={finalTitle || undefined}
    >
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
              AI-GENERATED TUMOR EVOLUTION
            </div>
            <div className="relative h-[calc(100%-2rem)]">
              {currentEvolution ? (
                <Image src={currentEvolution} alt="Evolution" fill className="object-contain" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-neutral-300 font-mono">
                  {isLoading ? "GENERATING IMAGERY..." : "AWAITING UPLOAD"}
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
            {isLoading && (
              <div className="mb-3 text-[10px] text-neutral-400 font-mono">Analyzing... stand by</div>
            )}
            <p className="text-xs text-neutral-50 leading-relaxed whitespace-pre-wrap">{analysis || "Upload an MRI image to generate analysis."}</p>
            {finalTitle && (
              <div className="mt-4">
                <div className="text-xs font-mono text-neutral-300">TITLE</div>
                <div className="text-xs text-neutral-50">{finalTitle}</div>
              </div>
            )}
            {finalSummary && (
              <div className="mt-3">
                <div className="text-xs font-mono text-neutral-300">SUMMARY</div>
                <div className="text-xs text-neutral-200">{finalSummary}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </C3Layout>
  );
}
