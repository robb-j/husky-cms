# Use a node alpine image install packages and run the start script

# [Stage 1] Setup shared base image
FROM node:10-alpine as base
WORKDIR /app
COPY [ "package.json", "package-lock.json", "/app/" ]

# [Stage 2] Copy assets and run parcel-bundler
FROM base as builder
RUN npm ci > /dev/null
COPY [ ".babelrc", ".eslintrc.js", "/app/" ]
COPY [ "app", "/app/app" ]
COPY [ "static", "/app/static" ]
RUN npm run build > /dev/null

# [State 3] Setup server & copy in generated assets
FROM base as prod
ENV NODE_ENV=production
EXPOSE 3000
RUN npm ci > /dev/null
COPY --from=builder [ "/app/dist", "/app/dist" ]
COPY [ "static", "/app/static" ]
COPY [ "app", "/app/app" ]
COPY [ "server", "/app/server" ]
CMD [ "npm", "start", "-s" ]
