export function serializeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "bigint") return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = serializeData(value);
    }
    return result;
  }
  return data;
}

export function apiResponse(data: unknown, status = 200) {
  return Response.json(serializeData(data), {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
