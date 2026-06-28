# Cloud Run Setup (do this from your phone's browser)

Everything is already coded. You just need to create the Google Cloud project
and add two secrets to GitHub. Takes about 10 minutes.

---

## Step 1 — Create a Google Cloud project

1. Open **console.cloud.google.com** on your phone and sign in with your Google account.
2. Click the project picker at the top → **New Project**.
3. Name it `choir-player` (or anything you like). Note the **Project ID** shown below the name — you'll need it later.
4. Click **Create**.

## Step 2 — Enable billing

Cloud Run requires billing to be enabled (but the free tier covers personal use).

1. In the left menu → **Billing** → link a credit card if you haven't already.
2. You won't be charged for light personal use — Cloud Run's free tier includes
   2M requests + 360k GB-seconds per month.

## Step 3 — Enable APIs

Go to **APIs & Services → Enable APIs and Services**, search for and enable each:

- **Cloud Run Admin API**
- **Artifact Registry API**
- **Cloud Build API** (needed to push images)

Or use this direct link (replace `YOUR_PROJECT_ID`):
`https://console.cloud.google.com/flows/enableapi?apiid=run.googleapis.com,artifactregistry.googleapis.com,cloudbuild.googleapis.com&project=YOUR_PROJECT_ID`

## Step 4 — Create Artifact Registry repository

1. Go to **Artifact Registry → Repositories → Create Repository**.
2. Name: `choir-player`
3. Format: **Docker**
4. Region: **us-central1**
5. Click **Create**.

## Step 5 — Create a service account

1. Go to **IAM & Admin → Service Accounts → Create Service Account**.
2. Name: `github-deployer`
3. Click **Create and Continue**.
4. Add these roles:
   - **Cloud Run Admin**
   - **Artifact Registry Writer**
   - **Service Account User**
5. Click **Done**.

## Step 6 — Create and download a JSON key

1. Click on the `github-deployer` service account you just created.
2. Go to the **Keys** tab → **Add Key → Create new key → JSON**.
3. A `.json` file will download. **Keep this safe** — it's a credential.

## Step 7 — Add secrets to GitHub

Open **github.com/DennisD0/Choir-Player → Settings → Secrets and variables → Actions → New repository secret**.

Add two secrets:

| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | Your Project ID from Step 1 (e.g. `choir-player-123456`) |
| `GCP_SA_KEY` | The **entire contents** of the JSON key file from Step 6 |

## Step 8 — Trigger the first deploy

Push any commit to `main` (or re-run the latest workflow in the **Actions** tab).
GitHub Actions will build the Docker image (takes ~5–10 min first time),
push it to Artifact Registry, and deploy it to Cloud Run.

The workflow prints the live URL at the end:
```
✅ Live at: https://choir-player-xxxx-uc.a.run.app
```

That's your permanent phone URL — photos work fully, no PC needed.

---

## Notes

- **Cold start**: After the app is idle for a while, the first request takes
  ~15–30 seconds to wake up. That's normal — subsequent requests are instant.
- **Memory**: The service is configured with 4 GB RAM which handles most hymn
  photos. If a large PDF ever times out, reply to the request with a note and
  it can be bumped to 8 GB.
- **Cost**: Essentially free for personal use. Cloud Run only charges when
  requests are actually being processed.
