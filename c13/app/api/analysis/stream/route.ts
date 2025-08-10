import { NextRequest } from "next/server";
import { store } from "../../_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Simulate streaming tokens for analysis
      const chunks = [
        "Analyzing hyperpolarized C13-pyruvate uptake... ",
        "Segmenting probable lesions... ",
        "Estimating metastatic burden... ",
        "Preparing clinical summary... ",
      ];
      for (const chunk of chunks) {
        send({ type: "token", content: chunk });
        await new Promise((r) => setTimeout(r, 600));
      }

      // Final structured payload
      const finalPayload = {
        type: "final",
        title: "Probable metastatic involvement in right adrenal region",
        summary:
          "Findings suggest moderate metastatic burden with hyperintense regions in hepatic segment IVa and right adrenal. Recommend PET-CT correlation.",
        prompts: [
          "High-contrast MRI axial slice highlighting right adrenal lesion, clinical presentation, grayscale, radiology style",
          "3D volumetric rendering of segmented hepatic metastases with overlay, clinical visualization, neutral palette",
          "Temporal evolution projection of lesion growth over 6 months, medical chart aesthetic, minimal",
        ],
      } as const;

      store.setAnalysis(jobId, {
        title: finalPayload.title,
        summary: finalPayload.summary,
        prompts: [...finalPayload.prompts],
      });

      send(finalPayload);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


