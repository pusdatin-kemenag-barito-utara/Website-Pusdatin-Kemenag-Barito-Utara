import PocketBase from "pocketbase";
import { env } from "../env";

let cachedClient: PocketBase | null = null;

export function getPocketBaseClient(): PocketBase {
  if (cachedClient) {
    return cachedClient;
  }

  const url = env.pocketbaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  cachedClient = new PocketBase(url);
  return cachedClient;
}

export const pb = getPocketBaseClient();
