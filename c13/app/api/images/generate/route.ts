import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "../../../../lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    jobId?: string;
    prompt?: string;
    index?: number;
  };
  const { prompt = "high-contrast medical visualization of tumor evolution", index = 0 } = body || {};
  const additionalContext = `
  You must generate an image that is a clone of the original MRI image, with slight modifications to the lesion progression.
  This should be according to the analysis summary prompt provided by the other agent.
  `

  const client = getOpenAIClient();
  if (!client) {
    // Fallback placeholders when no API key is set
    const samplePaths = [
      "/sample/sample_0.png",
      "/sample/sample_1.png",
      "/sample/sample_2.png",
    ];
    const imageUrl = samplePaths[index % samplePaths.length];
    return NextResponse.json({ imageUrl, prompt });
  }

  try {
    // Generate image via Images API; return as data URL so Next/Image can render immediately
    const result = await (client as any).images.generate({
      model: "gpt-image-1",
      prompt: `${prompt}\n\n${additionalContext}`,
      size: "1024x1024",
    });

    let imageUrl: string | undefined;
    const b64 = result?.data?.[0]?.b64_json as string | undefined;
    const url = result?.data?.[0]?.url as string | undefined;
    if (b64) {
      imageUrl = `data:image/png;base64,${b64}`;
    } else if (url) {
      // Fallback: fetch the URL and convert to data URL to satisfy Next/Image without changing config
      const resp = await fetch(url);
      const buf = Buffer.from(await resp.arrayBuffer());
      const guessed = resp.headers.get("content-type") || "image/png";
      imageUrl = `data:${guessed};base64,${buf.toString("base64")}`;
    }
    if (!imageUrl) return NextResponse.json({ error: "No image generated" }, { status: 500 });
    return NextResponse.json({ imageUrl, prompt });
  } catch (e) {
    console.error("[images] generation failed", e);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}


