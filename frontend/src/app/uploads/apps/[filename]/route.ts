import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const bucketName = process.env.R2_BUCKET_PUSDATIN || "data-pusdatin";
    const objectKey = `apps/${filename}`;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Convert the stream to a buffer (Node.js specific stream handling in Next.js)
    // @ts-ignore - response.Body is a ReadableStream in the browser, but a Readable in Node
    const stream = response.Body.transformToWebStream();

    const headers = new Headers();
    if (response.ContentType) {
      headers.set("Content-Type", response.ContentType);
    }
    if (response.ContentLength) {
      headers.set("Content-Length", response.ContentLength.toString());
    }
    
    // Set cache control for performance
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(stream, {
      headers,
    });
  } catch (error: any) {
    console.error("[IMAGE_PROXY] error:", error);
    if (error.name === 'NoSuchKey') {
      return new NextResponse("Not Found", { status: 404 });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}
