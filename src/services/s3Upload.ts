const S3_REGION = import.meta.env.VITE_AWS_S3_REGION ?? "";
const S3_BUCKET = import.meta.env.VITE_AWS_S3_BUCKET ?? "";
const S3_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID ?? "";
const S3_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ?? "";
const S3_SESSION_TOKEN = import.meta.env.VITE_AWS_SESSION_TOKEN ?? "";
const S3_PUBLIC_BASE_URL = import.meta.env.VITE_AWS_S3_PUBLIC_BASE_URL ?? "";
const S3_UPLOAD_PREFIX = (import.meta.env.VITE_AWS_S3_UPLOAD_PREFIX ?? "messages").replace(/^\/+|\/+$/g, "");

function assertS3Config() {
  if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Faltan variables de entorno de AWS S3 para subir imagenes");
  }
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toDateStamp(date: Date) {
  return toAmzDate(date).slice(0, 8);
}

function encodeS3Key(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const data = typeof input === "string" ? encoder.encode(input) : input;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Raw(key: ArrayBuffer | Uint8Array | string, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData =
    typeof key === "string"
      ? encoder.encode(key)
      : key instanceof Uint8Array
        ? key
        : new Uint8Array(key);

  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer | Uint8Array | string, message: string): Promise<string> {
  const signature = await hmacSha256Raw(key, message);
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string) {
  const kDate = await hmacSha256Raw(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  return hmacSha256Raw(kService, "aws4_request");
}

function buildObjectKey(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
  const safeExtension = extension ? `.${extension}` : "";
  return `${S3_UPLOAD_PREFIX}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${safeExtension}`;
}

function getPublicUrl(key: string) {
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodeS3Key(key)}`;
  }

  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeS3Key(key)}`;
}

async function uploadSingleImage(file: File): Promise<string> {
  assertS3Config();

  const key = buildObjectKey(file);
  const host = `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
  const url = `https://${host}/${encodeS3Key(key)}`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const payloadBuffer = await file.arrayBuffer();
  const payloadHash = await sha256Hex(payloadBuffer);
  const canonicalHeaders = [
    `content-type:${file.type || "application/octet-stream"}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    ...(S3_SESSION_TOKEN ? [`x-amz-security-token:${S3_SESSION_TOKEN}`] : []),
  ].join("\n");
  const signedHeaders = [
    "content-type",
    "host",
    "x-amz-content-sha256",
    "x-amz-date",
    ...(S3_SESSION_TOKEN ? ["x-amz-security-token"] : []),
  ].join(";");
  const canonicalRequest = [
    "PUT",
    `/${encodeS3Key(key)}`,
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await getSigningKey(S3_SECRET_ACCESS_KEY, dateStamp, S3_REGION, "s3");
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": file.type || "application/octet-stream",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(S3_SESSION_TOKEN ? { "x-amz-security-token": S3_SESSION_TOKEN } : {}),
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`No se pudo subir la imagen ${file.name} a S3`);
  }

  return getPublicUrl(key);
}

export async function uploadImagesToS3(files: File[]): Promise<string[]> {
  if (!files.length) {
    return [];
  }

  return Promise.all(files.map((file) => uploadSingleImage(file)));
}
