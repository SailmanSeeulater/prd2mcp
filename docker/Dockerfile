FROM node:24-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# pinned to the version you have locally; install scripts allowed for this package only
RUN npm install -g --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code@2.1.284

# the base image ships a non-root `node` user (uid 1000); never run generated code as root
USER node
WORKDIR /work
