# SvelteKit on adapter-node, built once and served from a small runtime image.
FROM node:24-alpine AS build

WORKDIR /app

# Dependencies first, so a source-only change reuses this layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* variables into the client bundle at build time, so the
# API origin is fixed here rather than at container start. Changing it means
# rebuilding the image, which is why the deploy passes it as a build argument.
ARG VITE_API_URL=https://feelm.org
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# The adapter bundles everything the server needs into build/, so the runtime
# image carries no node_modules at all.
FROM node:24-alpine AS prod

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json

# Runs unprivileged; the node image ships this user.
USER node

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "build"]
