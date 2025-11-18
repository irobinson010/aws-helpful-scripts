import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import yargs, { Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import {
  createS3Client,
  ensureObjectExists,
  parseS3Uri,
  ParsedS3Uri,
} from "./s3Utils";

async function createDownloadUrl(params: {
  parsed: ParsedS3Uri;
  region: string;
  expiresInSeconds: number;
}): Promise<string> {
  const { parsed, region, expiresInSeconds } = params;

  const s3 = createS3Client(region);

  const command = new GetObjectCommand({
    Bucket: parsed.bucket,
    Key: parsed.key,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

interface Args {
  uri: string;
  region: string;
  expires: number;
  curl: boolean;
  "output-name"?: string;
  json: boolean;
  "require-exists": boolean;
}

const parser: Argv<Args> = yargs(hideBin(process.argv)) as Argv<Args>;

(async () => {
  const argv = await parser
    .scriptName("generate-download-url")
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
    .option("curl", {
      type: "boolean",
      default: false,
      describe: "Also output an example curl command",
    })
    .option("output-name", {
      type: "string",
      describe:
        "Suggested local filename in the curl example (defaults to S3 object basename)",
    })
    .option("json", {
      type: "boolean",
      default: false,
      describe: "Output result as JSON instead of human-readable text",
    })
    .option("require-exists", {
      type: "boolean",
      default: false,
      describe:
        "Check that the S3 object exists before generating the URL (HEAD Object)",
    })
    .help()
    .strict()
    .parseAsync();

  try {
    const parsed = parseS3Uri(argv.uri);

    if (argv["require-exists"]) {
      const s3 = createS3Client(argv.region);
      await ensureObjectExists(s3, parsed);
    }

    const url = await createDownloadUrl({
      parsed,
      region: argv.region,
      expiresInSeconds: argv.expires,
    });

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
        requireExists: argv["require-exists"],
      };
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("Pre-signed download URL:");
    console.log(url);

    if (argv.curl) {
      const defaultName = parsed.key.split("/").pop() || "downloaded-file";
      const outputName = argv["output-name"] ?? defaultName;

      console.log("\nExample curl command:");
      console.log(`curl -L "${url}" -o ${JSON.stringify(outputName)}`);
    }
  } catch (err) {
    console.error("Error generating pre-signed download URL:");
    console.error(err);
    process.exit(1);
  }
})();

