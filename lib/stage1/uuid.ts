import { Stage1StorageError } from "./types";

type CryptoWithUuid = Crypto & {
  randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
};

export function createStableUuid(
  cryptoApi: CryptoWithUuid | undefined = globalThis.crypto,
): string {
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  throw new Stage1StorageError(
    "UUID_UNAVAILABLE",
    "createStableUuid",
    "当前环境无法安全生成本机身份标识。",
  );
}

