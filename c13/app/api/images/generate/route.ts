import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    jobId?: string;
    prompt?: string;
    index?: number;
  };
  const { prompt, index = 0 } = body || {};

  // Simulate model latency with staged delays
  await new Promise((r) => setTimeout(r, 5000));

  // Return placeholder image path; frontend already scales it
  const samplePaths = [
    "/sample/sample_0.png",
    "/sample/sample_1.png",
    "/sample/sample_2.png",
  ];

  const imageUrl = samplePaths[index % samplePaths.length];
  return NextResponse.json({ imageUrl, prompt });
}


