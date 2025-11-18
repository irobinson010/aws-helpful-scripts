import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createS3Client, parseS3Uri } from "./s3Utils";

async function createUploadUrl(params: {
  s3Uri: string;
  region: string;
  expiresInSeconds: number;
  contentType?: string;
}): Promise<string> {
  const { s3Uri, region, expiresInSeconds, contentType } = params;
  const parsed = parseS3Uri(s3Uri);

  const s3 = createS3Client(region);

  const command = new PutObjectCommand({
    Bucket: parsed.bucket,
    Key: parsed.key,
    ...(contentType ? { ContentType: contentType } : {}),
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

interface Args {
  uri: string;
  region: string;
  expires: number;
  "content-type"?: string;
  curl: boolean;
  json: boolean;
}

yargs(hideBin(process.argv))
  .scriptName("generate-upload-url")
  .usage("$0 --uri <s3-uri> [options]")
  .option("uri", {
    type: "string",
    demandOption: true,
    describe: "S3 URI (e.g. s3://bucket/path/to/file.csv)",
  })
  .option("region", {
    type: "string",
    default: "us-east-1",
    describe: "AWS region",
  })
  .option("expires", {
    type: "number",
    default: 900,
    describe: "URL expiration in seconds (default: 900 = 15 minutes)",
  })
  .option("content-type", {
    type: "string",
    describe: "Content-Type for the uploaded object (optional)",
  })
  .option("curl", {
    type: "boolean",
    default: false,
    describe: "Also output an example curl command",
  })
  .option("json", {
    type: "boolean",
    default: false,
    describe: "Output result as JSON instead of human-readable text",
  })
  .strict()
  .command<Args>(
    "$0",
    "Generate a pre-signed S3 upload URL",
    () => {},
    async (argv) => {
      try {
        const contentType = argv["content-type"];

        const baseParams = {
          s3Uri: argv.uri,
          region: argv.region,
          expiresInSeconds: argv.expires,
        };

        const url = await createUploadUrl(
          contentType
            ? { ...baseParams, contentType }
            : baseParams
        );

        const parsed = parseS3Uri(argv.uri);
        const expiresAt = new Date(
          Date.now() + argv.expires * 1000
        ).toISOString();

        if (argv.json) {
          const result = {
            url,
            bucket: parsed.bucket,
            key: parsed.key,
            expiresInSeconds: argv.expires,
            expiresAt,
          };
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log("Pre-signed upload URL:");
        console.log(url);

        if (argv.curl) {
          const suggestedFile =
            parsed.key.split("/").pop() || "FILE_TO_UPLOAD";

          const headerLine = contentType
            ? `  -H "Content-Type: ${contentType}" \\\n`
            : "";

          console.log("\nExample curl command:");
          console.log("curl -X PUT \\");
          console.log(`  -T ./${suggestedFile} \\`);
          if (headerLine) {
            process.stdout.write(headerLine);
          }
          console.log(`  "${url}"`);
        }
      } catch (err) {
        console.error("Error generating pre-signed upload URL:");
        console.error(err);
        process.exit(1);
      }
    }
  )
  .help()
  .parse();

