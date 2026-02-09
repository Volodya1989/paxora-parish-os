import { createHmac, createHash } from "crypto";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Cloudflare R2 configuration: ${name}`);
  }
  return value;
}

export function getR2Config() {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const bucket = requireEnv("CLOUDFLARE_R2_BUCKET");
  const accessKeyId = requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  const endpoint = requireEnv("CLOUDFLARE_R2_ENDPOINT").replace(/\/$/, "");
  const endpointUrl = new URL(endpoint);
  const endpointHasBucket =
    endpointUrl.hostname.startsWith(`${bucket}.`) ||
    endpointUrl.pathname === `/${bucket}` ||
    endpointUrl.pathname.startsWith(`/${bucket}/`);
  const defaultPublicUrl = endpointHasBucket ? endpoint : `${endpoint}/${bucket}`;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? defaultPublicUrl;

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    publicUrl,
    endpointHasBucket
  };
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toAmzDate(date: Date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8)
  };
}

function encodePath(value: string) {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function signR2PutUrl({
  key,
  contentType,
  expiresInSeconds
}: {
  key: string;
  contentType: string;
  expiresInSeconds: number;
}) {
  const { bucket, accessKeyId, secretAccessKey, endpoint, endpointHasBucket } =
    getR2Config();
  const url = new URL(endpoint);
  const host = url.host;
  const method = "PUT";
  const { amzDate, dateStamp } = toAmzDate(new Date());
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const basePath =
    endpointHasBucket && url.pathname !== "/"
      ? url.pathname.replace(/\/$/, "")
      : endpointHasBucket
        ? ""
        : `/${bucket}`;
  const canonicalUri = `${basePath}/${encodePath(key)}`;
  const signedHeaders = "content-type;host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  });

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  query.set("X-Amz-Signature", signature);

  return `${url.origin}${canonicalUri}?${query.toString()}`;
}
