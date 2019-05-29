# Use a node alpine image install packages and run the start script

# [Stage 1] Setup shared base image
FROM node:10-alpine as base
WORKDIR /app
COPY ["package*.json", "/app/"]

# [Stage 2] Copy assets and run parcel-bundler
FROM base as builder
ENV NODE_ENV development
RUN npm ci &> /dev/null
COPY [ ".babelrc", ".eslintrc.yml", "/app/" ]
COPY [ "app", "/app/app" ]
COPY [ "static", "/app/static" ]
RUN npm run build > /dev/null

# [State 3] Setup server & copy in generated assets
FROM base as prod
ENV NODE_ENV=production
EXPOSE 3000
RUN npm ci &> /dev/null
COPY --from=builder [ "/app/dist", "/app/dist" ]
COPY [ "static", "/app/static" ]
COPY [ "server", "/app/server" ]
COPY [ "plugins", "/app/plugins" ]
CMD [ "npm", "start", "-s" ]
