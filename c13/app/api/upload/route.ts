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
  const filename = (file as File).name;

  const job = store.createJob(filename);

  // In a later step: persist file or upload to storage and enqueue processing

  return NextResponse.json({ jobId: job.id });
}


