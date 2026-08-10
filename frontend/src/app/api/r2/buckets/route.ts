import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare credentials not configured' },
        { status: 500 }
      );
    }

    // 1. Fetch list of buckets
    const listRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      throw new Error(`Failed to list buckets: ${errorText}`);
    }

    const listData = await listRes.json();
    if (!listData.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(listData.errors)}`);
    }

    const buckets = listData.result?.buckets || [];

    // 2. Fetch usage for each bucket in parallel
    const bucketsWithUsage = await Promise.all(
      buckets.map(async (bucket: any) => {
        try {
          const usageRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket.name}/usage`,
            {
              headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            }
          );
          
          if (usageRes.ok) {
            const usageData = await usageRes.json();
            if (usageData.success && usageData.result) {
              return {
                ...bucket,
                usage: usageData.result,
              };
            }
          }
          // Fallback if usage fetch fails for a single bucket
          return {
            ...bucket,
            usage: {
              payloadSize: 0,
              metadataSize: 0,
              objectCount: 0,
              uploadCount: 0,
            },
          };
        } catch (err) {
          return {
            ...bucket,
            usage: {
              payloadSize: 0,
              metadataSize: 0,
              objectCount: 0,
              uploadCount: 0,
            },
          };
        }
      })
    );

    return NextResponse.json({ success: true, buckets: bucketsWithUsage });
  } catch (error: any) {
    console.error('R2 API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch R2 data' },
      { status: 500 }
    );
  }
}
