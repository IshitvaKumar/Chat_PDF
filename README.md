# PDF Insight

A secure, single-user MVP for uploading a PDF and asking document-grounded questions. It uses Gemini File Search, so PDFs are indexed once and only relevant passages are retrieved for each question.

## Run locally

1. Install Node.js 22 or later.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` from `.env.example`, then add a **free-tier Gemini API key**:

   ```env
   GEMINI_API_KEY=your_key_here
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000` and upload a PDF up to 20 MB.

## What the MVP does

- Validates a PDF, uploads it from a server-side route, and waits for Gemini File Search indexing.
- Creates one Gemini File Search store per document, so every chat request is scoped to its selected PDF.
- Uses the free-tier `gemini-3.5-flash` model through the Interactions API; returned citations and page numbers are shown underneath an answer when available.
- Keeps the API key exclusively on the server.
- Stores document handles locally in `data/documents.json` (the PDF itself is not stored in this repository).
- Deletes the associated Gemini File Search store when `DELETE /api/documents?id=<id>` is called.

## Free-tier safeguards

- The model is fixed in code to `gemini-3.5-flash`, a Gemini File Search-capable free-tier model. There is no environment setting that can silently switch it to a paid model.
- This app uses Gemini File Search only. It does not enable Google Search grounding, URL Context, a paid key, or billing.
- Keep billing disabled for the Google project that owns your API key. Google enforces free-tier availability and quota by project and region; if quota runs out, requests fail instead of becoming paid requests.
- Gemini's free tier may use submitted content to improve Google products. Do not upload sensitive PDFs. Consult Google's current terms and privacy controls before using non-public material.
- Gemini File Search can take time to make a new document retrievable. The chat request gives Gemini up to 25 seconds, then returns a readable retry message instead of allowing a hosting platform to return an opaque timeout page.

## Production checklist

This starter deliberately has no user accounts. It uses `data/documents.json` only in local development; a production build requires Supabase so document IDs survive serverless deployments.

### Deploy on Vercel with Supabase

1. Create a free Supabase project, then open its **SQL Editor** and run [supabase/schema.sql](supabase/schema.sql).
2. In Supabase **Project Settings → API**, copy the Project URL and the **service-role secret key**. Keep the service-role key private.
3. Push this project to a private Git repository, then import it into Vercel as a Next.js project.
4. Add these **Production** environment variables in Vercel:

   ```env
   GEMINI_API_KEY=your_free_tier_gemini_key
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
   ```

5. Deploy. Vercel detects the Next.js app automatically.

`GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never start with `NEXT_PUBLIC_`; that prefix sends variables to every browser visitor.

### Before sharing publicly

- Add authentication and enforce `userId` ownership checks in every document/chat route.
- Store rate-limit and audit information; add a per-user upload and request budget.
- Use object storage for original files if you need a downloadable/viewable copy.
- Use a malware scan and asynchronous job queue for large or high-volume uploads.
- Add monitoring and a scheduled cleanup policy for orphaned OpenAI files/vector stores.

## Useful commands

```bash
npm run typecheck
npm run lint
npm run build
```
