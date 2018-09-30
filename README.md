# Node Sample Project

A project setup with [robb-j/node-base](https://github.com/robb-j/node-base/) template which creates a node app, with the common things already setup.

## Dev Commands

```bash

# Build & publish the image (from node-9:alpine)
# -> uses REGISTRY file & the npm version to tag image
npm run push-image

# Update version (builds & pushes a new docker image)
npm version ... # --help

# Lint the web & test directories
npm run lint

# Run the unit tests
npm test

# Generate coverage
npm run coverage          # outputs to coverage/
npm run coverage-summary  # outputs to terminal

# Watch code with nodemon (restarts on file changes)
npm run watch

```
