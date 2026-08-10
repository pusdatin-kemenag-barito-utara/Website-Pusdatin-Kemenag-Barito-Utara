import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionContext } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = file.name.split(".").pop();
    const filename = `app-logo-${uniqueSuffix}.${extension}`;

    const bucketName = process.env.R2_BUCKET_PUSDATIN || "data-pusdatin";
    const objectKey = `apps/${filename}`;

    // Upload to Cloudflare R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Return the relative URL so it goes through our proxy route
    const fileUrl = `/uploads/apps/${filename}`;

    return NextResponse.json({ url: fileUrl, message: "File uploaded successfully" });
  } catch (error) {
    console.error("[UPLOAD] error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
