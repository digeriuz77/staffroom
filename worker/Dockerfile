FROM oven/bun:1 AS base
WORKDIR /app

# The worker lives alongside the app and shares src/lib. Copy the whole repo
# (deps install at the root); Railway builds from repo root.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Run the queue-drain loop. Set env vars (SUPABASE_*, REDDIT_*, EMBEDDINGS_*)
# in the Railway service configuration.
CMD ["bun", "run", "worker/index.ts"]
