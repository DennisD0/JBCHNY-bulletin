# ── Stage 1: Build Next.js ────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /build
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# eclipse-temurin gives us a production JRE 21 on Ubuntu Jammy — exactly what
# Audiveris needs. We add Node.js 20 on top for Next.js.
FROM eclipse-temurin:21-jre-jammy AS runner

# Node.js 20 (LTS)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# System libraries Sharp needs (image processing for the upload pipeline)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# ── Audiveris JARs ────────────────────────────────────────────────────────────
# The cross-platform JARs are committed to the repo (tools/audiveris/Audiveris/app/).
# The two platform-specific native JARs (tesseract + leptonica) are fetched from
# Maven Central for linux-x86_64 and placed alongside the rest.
WORKDIR /opt/audiveris/app
COPY tools/audiveris/Audiveris/app/ ./
RUN curl -fsSL \
      "https://repo1.maven.org/maven2/org/bytedeco/leptonica/1.85.0-1.5.12/leptonica-1.85.0-1.5.12-linux-x86_64.jar" \
      -o leptonica-1.85.0-1.5.12-linux-x86_64.jar \
 && curl -fsSL \
      "https://repo1.maven.org/maven2/org/bytedeco/tesseract/5.5.1-1.5.12/tesseract-5.5.1-1.5.12-linux-x86_64.jar" \
      -o tesseract-5.5.1-1.5.12-linux-x86_64.jar

# ── Tesseract language data ────────────────────────────────────────────────────
# Full tessdata (with the legacy engine Audiveris requires) committed to the repo.
COPY tools/audiveris/tessdata/ /opt/audiveris/tessdata/

# ── Next.js standalone app ────────────────────────────────────────────────────
WORKDIR /app
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

# Re-install sharp for linux so the native bindings match the runtime OS
RUN npm install --no-save sharp

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Audiveris engine config (tells lib/audiveris.ts where to find the JARs)
ENV AUDIVERIS_APP_DIR=/opt/audiveris/app
ENV AUDIVERIS_TESSDATA_DIR=/opt/audiveris/tessdata

EXPOSE 8080
CMD ["node", "server.js"]
