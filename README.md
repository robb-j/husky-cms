# Husky CMS

Use a [Trello](https://trello.com) board as a CMS to create & manage a website.

## Features

- Use Trello cards to represent the pages, blog posts and projects on your site
- Pages render the markdown in your card's description
- Setup a blog, which is a Trello list, then quickly add and author posts
- Showcase projects, which is a different Trello list, then filter and view them
- Configurable structure, showing only the pages you want
- Content caching so you don't get rate limited and page loads are fast
- Plugin system for dynamically adding your own page types

<!-- toc-head -->

## Table of contents

- [Features](#features)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Steps](#steps)
  - [Configuring](#configuring)
  - [Page options](#page-options)
  - [Multi page mode](#multi-page-mode)
  - [Plugins](#plugins)
    - [Page plugins](#page-plugins)
    - [Content plugins](#content-plugins)
    - [Fetching cards](#fetching-cards)
- [Development](#development)
  - [Setup](#setup)
  - [Regular use](#regular-use)
  - [Irregular use](#irregular-use)
  - [Environment](#environment)
  - [Code formatting](#code-formatting)
  - [Building the docker image](#building-the-docker-image)
- [Ideas & further work](#ideas--further-work)

<!-- toc-tail -->

## Setup

### Prerequisites

- Know how to use `docker` & `docker-compose`
- A Trello account and board to author your content
- Understand JSON

### Steps

1. Get a Trello authentication key & token
2. Get your `TRELLO_APP_KEY` from [trello.com/app-key](https://trello.com/app-key)
3. Using your key, get your `TRELLO_TOKEN` from `https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&name=Husky%20CMS&key=__YOUR_KEY_HERE__`
4. Make a Trello board for your site's content
   - Add 4 lists: `Draft`, `Pages`, `Blog`, `Projects` and get the ids for them
   - You'll need to get the id's of your lists to pass them to Husky
     - Open a card on the list you want to get the id of
     - Add `.json` onto the end of the url & reload
     - Copy the text and paste it into a [JSON formatter](https://jsonformatter.curiousconcept.com)
     - Find the value for `idList` in the parsed json
5. Create a **docker-compose.yml** using your auth and the ids of those lists

```yml
version: '3'

services:
  redis:
    image: redis:4-alpine
    restart: unless-stopped

  husky-site:
    image: openlab/husky-cms:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      SITE_NAME: FancySite
      REDIS_URL: redis://redis
      TRELLO_APP_KEY: your_trello_app_key
      TRELLO_TOKEN: your_trello_app_key
      PAGE_LIST: list_id_for_pages
      PROJECT_LIST: list_id_for_projects
      BLOG_LIST: list_id_for_blog_posts
```

4. Run `docker-compose up -d`

5. Visit [localhost:3000](http://localhost:3000)

6. Add cards to your board and see how the site changes

### Configuring

You can set different combinations of lists.
If you just have `PROJECT_LIST` or `BLOG_LIST` set, the site will just contain that page.
If you have `PAGE_LIST` set, the site will show multiple pages.

**Important** – When using `PAGE_LIST`, Husky uses a card named `Home` as the root page of your site.

### Page options

Blog and project pages have extra environment variables to configure their render.

`BLOG_SLUG` & `PROJECT_SLUG` are used to determine the url basis for the page and sub pages.

`BLOG_NAME` & `PROJECT_NAME` is used for the navigation name.
You can set to empty string, `''`, to hide the page from navigation.

`BLOG_TITLE`, `BLOG_SUBTITLE`, `PROJECT_TITLE` & `PROJECT_SUBTITLE`
configure the [bulma hero](https://bulma.io/documentation/layout/hero/) on the page.
Again you can set to an empty string, `''`, to hide the hero.

### Multi page mode

If you want more that one of a blog or project page you can set `BLOG_LIST` or `PROJECT_LIST`
to a comma seperated list of ids instead of just one.
For example `'FIRST_ID,SECOND_ID,THIRD_ID'`

When in multi-page mode, each list id becomes a root-level page with the index added on the end.
For example, `/projects_1`, `/projects_2` and `/projects_1`.
You can combine this with setting `PROJECT_NAME` or `BLOG_NAME` to an empty string `''`,
to hide all the pages from the navigation.

### Plugins

Husky uses plugins to add different page types, for examples see [server/modules](/server/modules). To add your own plugins, mount them in with a docker volume.

```yml
volumes:
  - ./my_plugin.js:/app/plugins/my_plugin.js
  - ./my_template.pug:/app/plugins/templates/my_template.pug
```

There are two types of plugin, [Page plugins](#page-plugins) & [Content plugins](#content-plugins).

#### Page plugins

A page plugin adds a type of page to Husky, optionaly rendered if it's variables are set.
It'll appear in the nav along the top, or at the root if just this page's variables are set.

Here's an example page plugin, **my_plugin.js**

```js
function route(ctx) {
  const message = process.env.MESSAGE
  ctx.renderPug('my_template', 'My Page', { message })
}

module.exports = function(husky, utils) {
  husky.registerPage('my_page', {
    name: 'My Page',
    templates: ['my_template'],
    variables: ['MESSAGE'],
    routes: {
      './': route
    }
  })
}
```

And its corresponding template, **my_template.pug**

```pug
.hero.is-large.is-primary
  .hero-body
    .container
      h1.title Page says: #{message}
```

This adds a custom page type, `my_page`, which shows when the `MESSAGE` environment variable is set. If only the `MESSAGE` variable is set, it will be the only page, `/` otherwise it will be at `/my_page` and appear as `My Page`.

The pug template is rendered inside the site skeleton, which has the theme loaded along with the nav bar and footer above and below it.

Your plugin should expose a single function via `module.exports`, which takes a [husky instance](/server/husky.js) and [utils object](/server/utils/index.js) as parameters.

If you want to serve static files, you can always mount them into `/app/static`.

**Routing**

Husky uses [Koa](https://www.npmjs.com/package/koa) under the hook and modifies its context:

| field         | type   | use                                                    |
| ------------- | ------ | ------------------------------------------------------ |
| ctx.sitemode  | string | If the site is serving a specific page or any          |
| ctx.skipCache | bool   | Whether to skip using the trello cache i.e. `?nocache` |
| ctx.pages     | card[] | The page cards from the list with id `PAGE_LIST`       |
| ctx.sitetree  | node[] | The sitetree nodes for the active pages                |
| ctx.husky     | husky  | The husky reference                                    |

It also adds these methods for rendering / errors

```js
ctx.renderPug(template, title, data)
ctx.notFound()
```

#### Content plugins

A content plugin lets your customise how a card is rendered into html.

```js
let pageviews = {}

module.exports = function(husky, utils) {
  husky.registerContentType('pageviews', {
    parser: card => {
      if (!pageviews[card.id]) {
        pageviews[card.id] = 0
      }

      return `<p> Page views: ${++pageviews[card.id]}`
    },
    order: 75
  })
}
```

This registers a plugin which adds the pageviews at the bottom of each page. Here is the available config:

> By default each blob is wrapped in a `<div class="content-TYPE">`, where `TYPE` is your plugin name.

| field     | type    | use                                                   |
| --------- | ------- | ----------------------------------------------------- |
| parser    | func    | The parser function, takes a card and returns html    |
| order     | number  | Where to put this content, 0 being earlier, 100 later |
| noWrapper | boolean | If you don't want the content to be wrapped in a div  |

**Ordering**

The ordering numbers are arbitrary and are rendered lowest first.
The card's markdown is rendered at order `50`,
so less than that will be before the markdown
and more than that will be after.

#### Fetching cards

Husky periodically fetches cards from Trello and puts them into redis at a predefined interval.
Internally this uses the `husky.fetchCards(listId)` method.

Whenever you call this method, husky will remember your `listId`
and periodically fetch new cards.

The default interval is 5000 milliseconds but you can override this
by setting the `POLL_INTERVAL` environment variable.
Set it to the number of milliseconds you want to wait between fetches.

```js
let cards = await husky.fetchCards('your_list_id')
```

## Development

### Setup

To develop on this repo you will need to have [Docker](https://www.docker.com/) and
[node.js](https://nodejs.org) installed on your dev machine and have an understanding of them.
This guide assumes you have the repo checked out and are on macOS, but equivalent commands are available.

You'll only need to follow this setup once for your dev machine.

```bash
# Setup your ENV, using the same environment variables from above
cp .env.example .env
```

### Regular use

These are the commands you'll regularly run to develop the API, in no particular order.

```bash
# Startup a development redis database
# -> Runs on port 6379 on localhosts
docker-compose up -d

# Startup the dev server
# > This will watch for changes in /app and rebuild js/sass assets
# > This will NOT watch js for changes in /server, you need to restart it for that
# > This will recompile .pug templates when NODE_ENV=development is set in your .env
npm run dev

# Deploy docker images
# > Uses REGISTRY file & package version to tag the image and push to dockerhub
# > More info: https://docs.npmjs.com/cli/version
npm version # major | minor | patch

# Stop the development redis database
# -> Do this after you stop development
docker-compose stop
```

### Irregular use

These are commands you might need to run but probably won't, also in no particular order.

```bash
# Generate js and css assets using parcel-bundler
# -> Writes them to the dist/ folder
npm run build

# Generate the table of contents for this readme
# -> It'll replace content between the toc-head and toc-tail HTML comments
npm run gen-readme-toc

# Manually lint code with Eslint
npm run lint

# Manually format code
# -> This repo is setup to automatically format code on git-stage
npm run prettier

# Run the application in production
# -> This is the entrypoint in the docker image
# -> It assumes assets are built into dist/
npm run start
```

### Environment

The server behaves differently depending on what `NODE_ENV` is set

**development**

> Run with `npm run dev`

- `.pug` files will be compiled for each request, so you always get the latest version
- Requests to trello will not be cached
- `.js` & `.sass` assets will be hot-reloaded, meaning they will update in the browser on save

**production**

> Run with `npm run start`

- `.pug` files will be compiled once at startup
- `.js` & `.css` assets will be optimised and minimised

### Code formatting

This repo uses [Prettier](https://prettier.io/) to automatically format code to a consistent standard.
It works using the [husky](https://www.npmjs.com/package/husky)
and [lint-staged](https://www.npmjs.com/package/lint-staged) packages to
automatically format code whenever code is commited.
This means that code that is pushed to the repo is always formatted to a consistent standard.

You can manually run the formatter with `npm run prettier` if you want.

Prettier is slightly configured in [.prettierrc.yml](/.prettierrc.yml)
and also ignores files using [.prettierignore](/.prettierignore).

### Building the docker image

This repo uses an npm `postversion` script to automatically build a version of the docker image whenever the npm version changes.
This is designed to be used with the `npm version` command so all docker images are [semantically versioned](https://semver.org/).

## Ideas & further work

- Display card's attachments, for example:
  - A carousel of images
  - A preview of a git repo
  - Embedding a youtube video
- Use linked cards to nest pages and create a page hierarchy
- Different page templates
- Commenting / voting using the Trello API
- Use the board's theme to colour the site
- A CLI to ease scraping trello for keys and ids

---

> This repo was setup with [robb-j/node-base](https://github.com/robb-j/node-base/)
