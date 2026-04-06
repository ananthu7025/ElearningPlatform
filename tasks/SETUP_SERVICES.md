# Service Setup Guide — Video Upload (Mux) & PDF Upload (Cloudflare R2)

---

## 1. Mux — Video Upload Service

Mux handles video encoding, storage, and streaming. We use **Mux Direct Uploads** so the browser uploads directly to Mux (not through our server).

### Step 1 — Create a Mux Account

1. Go to [https://mux.com](https://mux.com) and sign up.
2. After login, go to **Dashboard → Settings → Access Tokens**.

### Step 2 — Create an API Access Token

1. Click **Generate new token**.
2. Set permissions:
   - **Mux Video** → `Full Access`
   - **Mux Data** → `Read` (optional, for analytics)
3. Copy the **Token ID** and **Token Secret** — you only see the secret once.

### Step 3 — Set Up a Webhook

Mux fires webhooks when a video finishes processing. Our app needs this to store the `playbackId` on the lesson.

1. Go to **Dashboard → Settings → Webhooks**.
2. Click **Add Webhook Endpoint**.
3. Set URL to: `https://yourdomain.com/api/webhooks/mux`
4. Select these events:
   - `video.upload.asset_created`
   - `video.asset.ready`
5. Copy the **Signing Secret** shown after saving.

> For local development, use [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose `localhost:3000` publicly, then use that URL as your webhook endpoint.

### Step 4 — Add Environment Variables

Add these to your `.env` file:

```env
MUX_TOKEN_ID=your_token_id_here
MUX_TOKEN_SECRET=your_token_secret_here
MUX_WEBHOOK_SECRET=your_webhook_signing_secret_here
```

### Step 5 — Install Mux SDK

```bash
npm install @mux/mux-node
```

### How It Works in This App

```
Browser                     Our API                   Mux
  |                            |                        |
  |-- POST /upload/video ----→ |                        |
  |   { lessonId }             |-- Create Direct Upload→|
  |                            |←-- { uploadUrl, id } --|
  |←-- { uploadUrl } ---------|                        |
  |                            |                        |
  |-- PUT uploadUrl (video) -------------------------→ |
  |                            |                        |
  |                            |←-- Webhook: upload.asset_created (lessonId in passthrough)
  |                            |    → saves muxAssetId on lesson
  |                            |                        |
  |                            |←-- Webhook: asset.ready
  |                            |    → saves muxPlaybackId + durationSeconds on lesson
```

### Playback

Use `@mux/mux-player-react` for playback:

```bash
npm install @mux/mux-player-react
```

```tsx
import MuxPlayer from '@mux/mux-player-react'

<MuxPlayer playbackId={lesson.muxPlaybackId} />
```

---

## 2. Cloudflare R2 — PDF / File Storage

Cloudflare R2 is an S3-compatible object storage with no egress fees. We use it for PDFs and other course materials.

### Step 1 — Create a Cloudflare Account

1. Go to [https://cloudflare.com](https://cloudflare.com) and sign up.
2. From the dashboard sidebar, go to **R2 Object Storage**.

### Step 2 — Create a Bucket

1. Click **Create bucket**.
2. Name it something like `ledx-elearn` or `lms-materials`.
3. Choose a region (or leave it as automatic).
4. Click **Create bucket**.

### Step 3 — Enable Public Access (for reading files)

1. Open the bucket → go to **Settings** tab.
2. Under **Public access**, click **Allow Access** → **Yes, allow**.
3. Copy the **Public Bucket URL** — it looks like:
   `https://pub-xxxxxxxx.r2.dev`

   This is your `R2_PUBLIC_URL`.

> Alternatively, set up a custom domain under **Custom Domains** in bucket settings.

### Step 4 — Create an API Token

1. In R2, click **Manage R2 API Tokens** (top right of R2 page).
2. Click **Create API token**.
3. Set:
   - **Token name**: `ledx-elearn-api`
   - **Permissions**: `Object Read & Write`
   - **Bucket**: Select your specific bucket (recommended) or `All buckets`
4. Click **Create API Token**.
5. Copy:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint** — looks like `https://<account_id>.r2.cloudflarestorage.com`

### Step 5 — Add Environment Variables

```env
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=ledx-elearn
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
```

### Step 6 — Install AWS SDK (S3-compatible)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### How It Works in This App

```
Browser                     Our API                    R2
  |                            |                        |
  |-- POST /upload/presigned →|                        |
  |   { fileName, contentType, folder }                |
  |                            |-- Generate presigned PUT URL
  |←-- { url, key, publicUrl }|                        |
  |                            |                        |
  |-- PUT url (PDF file) ----------------------------→ |
  |                            |                        |
  |-- POST /modules/:id/lessons (create lesson)        |
  |-- PUT /lessons/:id { pdfKey: key } (attach file)  |
```

Files are stored at path: `materials/<uuid>.pdf`
Accessible at: `https://pub-xxxxxxxx.r2.dev/materials/<uuid>.pdf`

---

## 3. Local Development Tips

### Mux Webhook — Expose Local Server

Install ngrok:
```bash
brew install ngrok
ngrok http 3000
```
Use the `https://xxxx.ngrok.io` URL as your Mux webhook endpoint during development.

### R2 CORS — Allow Browser Uploads

If you see CORS errors when uploading directly from the browser to R2:

1. Go to your R2 bucket → **Settings** → **CORS Policy**.
2. Add this policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Mux CORS — Already Handled

The `cors_origin` field is set in `POST /upload/video` when creating the Mux direct upload:
```ts
cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? '*'
```

Add this to your `.env`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Full `.env` Reference for Media Services

```env
# Mux
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=

# Cloudflare R2
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev

# App URL (used by Mux CORS)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Checklist

### Mux
- [ ] Account created
- [ ] API token created with Video Full Access
- [ ] Webhook endpoint configured with correct URL
- [ ] `video.upload.asset_created` and `video.asset.ready` events enabled
- [ ] Webhook signing secret copied
- [ ] `.env` updated with MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_WEBHOOK_SECRET
- [ ] `@mux/mux-node` installed
- [ ] For local dev: ngrok running and webhook URL updated in Mux dashboard

### Cloudflare R2
- [ ] Account created
- [ ] Bucket created
- [ ] Public access enabled on bucket
- [ ] API token created with Object Read & Write
- [ ] `.env` updated with all R2_ variables
- [ ] CORS policy added to bucket
- [ ] `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` installed
