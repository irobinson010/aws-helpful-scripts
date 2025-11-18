# S3 Pre-Signed URL Toolbox

This folder (`aws-helpful-scripts/node/s3`) contains a small TypeScript CLI toolbox for working with Amazon S3 pre-signed URLs:

- `generate-upload-url.ts` – create **pre-signed PUT URLs** for uploads
- `generate-download-url.ts` – create **pre-signed GET URLs** for downloads
- `s3Utils.ts` – shared helpers (S3 URI parsing, S3 client creation, etc.)

These tools are useful when you want other people or systems to upload/download specific S3 objects **without** giving them AWS credentials.

---

## Requirements

- **Node.js** (recommended: 18+)
- **npm** (comes with Node)
- An AWS account with:
  - IAM permissions for S3 (see [IAM Permissions](#iam-permissions))
  - Credentials configured via one of:
    - `~/.aws/credentials`
    - environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optionally `AWS_SESSION_TOKEN`)
    - an assumed role, etc.

---

## Installation & Setup

From this folder (`aws-helpful-scripts/node/s3`):

### 1. Install dependencies

All required dependencies are already listed in `package.json`. Just run:

```bash
npm install

