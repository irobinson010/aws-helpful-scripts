import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

export interface ParsedS3Uri {
  bucket: string;
  key: string;
}

export function parseS3Uri(uri: string): ParsedS3Uri {
  const prefix = "s3://";
  if (!uri.startsWith(prefix)) {
    throw new Error(`Invalid S3 URI: must start with "${prefix}"`);
  }

  const withoutScheme = uri.slice(prefix.length);
  const firstSlashIndex = withoutScheme.indexOf("/");

  if (firstSlashIndex === -1) {
    throw new Error("S3 URI must include a key/path after the bucket name");
  }

  const bucket = withoutScheme.slice(0, firstSlashIndex);
  const key = withoutScheme.slice(firstSlashIndex + 1);

  if (!bucket || !key) {
    throw new Error("Both bucket and key must be non-empty in S3 URI");
  }

  return { bucket, key };
}

export function createS3Client(region: string): S3Client {
  return new S3Client({ region });
}

export async function ensureObjectExists(
  s3: S3Client,
  parsed: ParsedS3Uri,
): Promise<void> {
  const { bucket, key } = parsed;

  await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
