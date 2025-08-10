import { NextRequest } from "next/server";
import { store } from "../../_store";
import { getOpenAIClient } from "../../../../lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }
  console.log("[analysis] GET /api/analysis/stream", { jobId });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const client = getOpenAIClient();
      const job = store.getJob(jobId);
      const dataUrl = job?.image ? `data:${job.image.mimeType};base64,${job.image.b64}` : undefined;
      console.log("[analysis] job image presence", {
        hasJob: Boolean(job),
        hasImage: Boolean(job?.image),
        mime: job?.image?.mimeType,
        b64Len: job?.image?.b64?.length,
      });
      // Immediate heartbeat so the client can render streaming status
      console.log("[analysis] initializing SSE, client", { hasKey: Boolean(client) });
      send({ type: "token", content: "Initializing analysis... " });
      // Keep-alive ping
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
        } catch (e) {
          console.warn("[analysis] ping enqueue failed", e);
        }
      }, 1000);
      if (!client) {
        console.log("[analysis] no OPENAI_API_KEY, using fallback simulation");
        // Fallback local simulation when no API key is configured
        const chunks = [
          "[FALLBACK] Analyzing hyperpolarized C13-pyruvate uptake... ",
          "[FALLBACK] Segmenting probable lesions... ",
          "[FALLBACK] Estimating metastatic burden... ",
          "[FALLBACK] Preparing clinical summary... ",
        ];
        for (const chunk of chunks) {
          console.log("[analysis] sim chunk", { len: chunk.length });
          send({ type: "token", content: chunk });
          await new Promise((r) => setTimeout(r, 600));
        }
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
        console.log("[analysis] sim final payload ready");
        send(finalPayload);
        console.log("[analysis] closing SSE (sim)");
        controller.close();
        return;
      }

      try {
        console.log("[analysis] calling OpenAI Responses streaming...");
        const input = [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You are a radiology analysis agent for hyperpolarized C13-pyruvate MRI. Stream only prose analysis tokens. Do NOT output JSON, code blocks, or structured objects in this message.",
              },
            ],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analyze the uploaded C13-pyruvate MRI image. Stream concise, clinically grounded analysis." },
              ...(dataUrl ? [{ type: "input_image", image_url: dataUrl }] : []),
            ],
          },
        ] as any[];

        if ((client as any).responses?.stream) {
          const rspStream = await (client as any).responses.stream({ model: "gpt-5", input });
          let tokenCount = 0;
          for await (const event of rspStream as any) {
            const type = event?.type as string;
            if (type === "response.output_text.delta") {
              const delta = event?.delta as string;
              if (delta) {
                tokenCount += delta.length;
                if (tokenCount % 200 === 0) console.log("[analysis] streamed tokens", { tokenCount });
                send({ type: "token", content: delta });
              }
            }
          }
        } else {
          // Fallback to Chat Completions streaming (older SDK)
          const messages = [
            { role: "system", content: [{ type: "text", text: (input[0] as any).content[0].text }] },
            {
              role: "user",
              content: [
                { type: "text", text: (input[1] as any).content[0].text },
                ...(dataUrl ? [{ type: "image_url", image_url: { url: dataUrl } }] : []),
              ],
            },
          ];
          console.log("[analysis] chat fallback with image?", { withImage: Boolean(dataUrl) });
          const response = await (client as any).chat.completions.create({ model: "gpt-5", stream: true, messages });
          for await (const chunk of response as any) {
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            if (delta) send({ type: "token", content: delta });
          }
        }
        console.log("[analysis] streaming finished, requesting final JSON");

        // Ask for final structured JSON (separate non-streaming turn)
        const final = await (client as any).responses?.create
          ? await (client as any).responses.create({
              model: "gpt-5",
              input: [
                { role: "system", content: [{ type: "input_text", text: "Return ONLY a compact JSON with {title, summary, prompts:[3]} for the same case. No prose." }] },
                {
                  role: "user",
                  content: [
                    { type: "input_text", text: "Summarize the same case into JSON fields strictly as specified." },
                    ...(dataUrl ? [{ type: "input_image", image_url: dataUrl }] : []),
                  ],
                },
              ],
            })
          : await (client as any).chat.completions.create({
              model: "gpt-5",
              messages: [
                { role: "system", content: "Return ONLY a compact JSON with {title, summary, prompts:[3]} for the same case. No prose." },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Summarize the same case into JSON fields strictly as specified." },
                    ...(dataUrl ? [{ type: "image_url", image_url: { url: dataUrl } }] : []),
                  ],
                },
              ],
            });

        const raw = (final as any).output_text ?? (final as any).choices?.[0]?.message?.content ?? "{}";
        console.log("[analysis] final JSON raw content", raw);
        const extractJson = (t: string) => {
          const start = t.indexOf("{");
          const end = t.lastIndexOf("}");
          if (start >= 0 && end > start) return t.slice(start, end + 1);
          return t;
        };
        const content = extractJson(raw);
        let parsed: any = {};
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          console.warn("[analysis] JSON parse failed; using empty payload");
        }
        const payload = {
          type: "final",
          title: parsed.title ?? "",
          summary: parsed.summary ?? "",
          prompts: Array.isArray(parsed.prompts) ? parsed.prompts.slice(0, 3) : [],
        } as const;

        store.setAnalysis(jobId, {
          title: payload.title,
          summary: payload.summary,
          prompts: [...payload.prompts],
        });
        console.log("[analysis] sending final payload to client");
        send(payload);
        clearInterval(ping);
        console.log("[analysis] closing SSE (openai)");
        controller.close();
      } catch (e) {
        console.error("[analysis] error during streaming", e);
        send({ type: "error", message: "Analysis generation failed" });
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}


export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      jobId?: string;
      imageDataUrl?: string;
      image?: { mimeType: string; b64: string };
    };
    const jobId = body.jobId || "";
    const job = jobId ? store.getJob(jobId) : undefined;
    const dataUrl = body.imageDataUrl
      ? body.imageDataUrl
      : body.image
      ? `data:${body.image.mimeType};base64,${body.image.b64}`
      : job?.image
      ? `data:${job.image.mimeType};base64,${job.image.b64}`
      : undefined;

    console.log("[analysis:POST] start", {
      hasJob: Boolean(job),
      hasBodyImage: Boolean(body.image || body.imageDataUrl),
      withDataUrl: Boolean(dataUrl),
    });

    const encoder = new TextEncoder();
    const client = getOpenAIClient();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (data: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        send({ type: "token", content: "[INFO] Initializing analysis...\n\n" });
        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
          } catch {}
        }, 1000);

        if (!client) {
          const chunks = [
            "[FALLBACK] Analyzing hyperpolarized C13-pyruvate uptake... ",
            "[FALLBACK] Segmenting probable lesions... ",
            "[FALLBACK] Estimating metastatic burden... ",
            "[FALLBACK] Preparing clinical summary... ",
          ];
          for (const c of chunks) {
            send({ type: "token", content: c });
            await new Promise((r) => setTimeout(r, 600));
          }
          const payload = {
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
          send(payload);
          clearInterval(ping);
          controller.close();
          return;
        }

        try {
          const input = [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text:
                    `You are a standalone radiology analysis agent for MRI images.
                    You act on an MRI image, it could be T1, T2, DWI. It could be a single slice or a 3D volume.
                    It could be a hyperpolarized C13-pyruvate MRI image, PET-CT, or any other MRI image.
                    You must attempt to identify the type of image, the type of contrast agent (if any), and the type of scan.
                    You are analyzing oncology cases (control/healthy, benign, malignant, etc.).
                    You must provide a verbose, clinically grounded analysis of the image and patient's condition, as well as 
                    speculate on the stage of the disease (precancerous, Stage 0/CIS, Stage 1, etc.).
                    Stream only prose analysis tokens.
                    Do NOT output JSON in this turn.`,
                },
              ],
            },
            {
              role: "user",
              content: [
                { type: "input_text", text: "Analyze the MRI image. Stream concise, clinically grounded analysis." },
                ...(dataUrl ? [{ type: "input_image", image_url: dataUrl }] : []),
              ],
            },
          ] as any[];

        if ((client as any).responses?.stream) {
          const rspStream = await (client as any).responses.stream({ model: "gpt-5", input });
          for await (const event of rspStream as any) {
            const t = String(event?.type || "");
            const delta: unknown = (event as any)?.delta ?? (event as any)?.output_text_delta ?? (event as any)?.text ?? "";
            if (typeof delta === "string" && delta.length) {
              send({ type: "token", content: delta });
            }
          }
          } else {
            const response = await (client as any).chat.completions.create({
              model: "gpt-5",
              stream: true,
              messages: [
                { role: "system", content: (input[0] as any).content[0].text },
                {
                  role: "user",
                  content: [
                    { type: "text", text: (input[1] as any).content[0].text },
                    ...(dataUrl ? [{ type: "image_url", image_url: { url: dataUrl } }] : []),
                  ],
                },
              ],
            });
            for await (const chunk of response as any) {
              const delta = chunk.choices?.[0]?.delta?.content ?? "";
              if (delta) send({ type: "token", content: delta });
            }
          }

          // Final compact JSON (non-streaming)
          const final = await (client as any).responses?.create
            ? await (client as any).responses.create({
                model: "gpt-5",
                input: [
                  { role: "system", content: [{ type: "input_text", text: "Return ONLY compact JSON {title, summary, prompts:[3]}." }] },
                  {
                    role: "user",
                    content: [
                      { type: "input_text", text: `Summarize same case into the JSON fields strictly as specified.
                      The JSON fields are:
                      - title: a short title for the case
                      - summary: a verbose summary of the case
                      - prompts: an array of 3 prompts for the image generation engine, the image generation engine doesn't have 
                      any context about the image. These prompts are meant to show potential progressions of the condition so
                      the generations must be clones of the original image with slight modifications to the lesion progression.
                      An example prompt could be: "Right adrenal lesion is slightly larger, but still within the normal range, do NOT make it larger than the <other region> (etc., etc.)
                      
                      The analysis the other agent provided is:
                      ${job?.analysis}
                      `},
                      ...(dataUrl ? [{ type: "input_image", image_url: dataUrl }] : []),
                    ],
                  },
                ],
              })
            : await (client as any).chat.completions.create({
                model: "gpt-5",
                messages: [
                  { role: "system", content: "Return ONLY compact JSON {title, summary, prompts:[3]}." },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: `Summarize same case into the JSON fields strictly as specified.
                      The JSON fields are:
                      - title: a short title for the case
                      - summary: a verbose summary of the case
                      - prompts: an array of 3 prompts for the image generation engine, the image generation engine doesn't have 
                      any context about the image. These prompts are meant to show potential progressions of the condition so
                      the generations must be clones of the original image with slight modifications to the lesion progression.
                      An example prompt could be: "Right adrenal lesion is slightly larger, but still within the normal range, do NOT make it larger than the <other region> (etc., etc.)

                      The analysis the other agent provided is:
                      ${job?.analysis}
                      ` },
                      ...(dataUrl ? [{ type: "image_url", image_url: { url: dataUrl } }] : []),
                    ],
                  },
                ],
              });

          const raw = (final as any).output_text ?? (final as any).choices?.[0]?.message?.content ?? "{}";
          const start = raw.indexOf("{");
          const end = raw.lastIndexOf("}");
          const content = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
          let parsed: any = {};
          try {
            parsed = JSON.parse(content);
          } catch {}
          const payload = {
            type: "final",
            title: parsed.title ?? "",
            summary: parsed.summary ?? "",
            prompts: Array.isArray(parsed.prompts) ? parsed.prompts.slice(0, 3) : [],
          } as const;
          send(payload);
          clearInterval(ping);
          controller.close();
        } catch (e) {
          send({ type: "error", message: "Analysis generation failed" });
          clearInterval(ping);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return new Response("Bad request", { status: 400 });
  }
}


