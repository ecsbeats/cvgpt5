import { NextRequest, NextResponse } from "next/server";
import { store } from "../_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file !== "object" || !("name" in file)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const blob = file as File;
  const filename = blob.name;

  const job = store.createJob(filename);

  // Convert to data URL (small hackathon-friendly storage)
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  store.setImage(job.id, { mimeType: blob.type, b64: base64 });

  // Debug logging
  console.log("[upload] stored image", {
    jobId: job.id,
    filename,
    mimeType: blob.type,
    sizeBytes: (blob as any).size ?? arrayBuffer.byteLength,
    b64Len: base64.length,
  });

  // In a later step: persist file or upload to storage and enqueue processing

  return NextResponse.json({ jobId: job.id });
}


