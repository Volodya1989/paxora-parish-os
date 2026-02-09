import { S3Client } from "@aws-sdk/client-s3";

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
  const endpoint = requireEnv("CLOUDFLARE_R2_ENDPOINT");
  const publicUrl =
    process.env.CLOUDFLARE_R2_PUBLIC_URL ?? `${endpoint.replace(/\/$/, "")}/${bucket}`;

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    publicUrl
  };
}

export function createR2Client() {
  const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}
