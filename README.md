# Husky CMS

Use [Trello](https://trello.com) as a CMS to create & manage a website.

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
  - [Configuration](#configuration)
  - [Plugins](#plugins)
    - [Page plugins](#page-plugins)
    - [Content plugins](#content-plugins)
    - [Husky API](#husky-api)
- [Development](#development)
  - [Environment](#environment)
- [Ideas & further work](#ideas--further-work)

<!-- toc-tail -->

## Setup

### Prerequisites

- Know how to use `docker` & `docker-compose`
- A Trello account and board to author your content
- Understand JSON

### Steps

1. Get a Trello authentication key & token
1. Get your `TRELLO_APP_KEY` from [trello.com/app-key](https://trello.com/app-key)
1. Using your key, get your `TRELLO_TOKEN` from `https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&name=Husky%20CMS&key=__YOUR_KEY_HERE__`
1. Make a Trello board for your site's content

- Add 4 lists: `Draft`, `Pages`, `Blog`, `Projects` and get the ids for them
- You'll need to get the id's of your lists to pass them to Husky
  1. Open a card on the list you want to get the id of
  2. Add `.json` onto the end of the url & reload
  3. Copy the text and paste it into a [JSON formatter](https://jsonformatter.curiousconcept.com)
  4. Find the value for `idList` in the parsed json

3. Create a **docker-compose.yml** using your auth and the ids of those lists

```yml
version: '3'

services:
  redis:
    image: redis:4-alpine
    restart: unless-stopped
  
  husky-site:
    image: unplatform/husky-cms:latest
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

### Configuration

You can set different combinations of lists.
If you just have `PROJECT_LIST` or `BLOG_LIST` set, the site will just contain that page.
If you have `PAGE_LIST` set, the site will show multiple pages

**Important** – When using `PAGE_LIST`, Husky uses a card named `Home` as the root page of your site.

**Important** – When editing content add `?nocache` to your URL otherwise content won't update straight away

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

This adds a custom page type, `my_page`, which shows when the `MESSAGE` environment variable is set. If only the `MESSAGE` variable is set, it will be the only and root page, `/` otherwise it will be at `/my_page` and appear as `My Page`.

The pug template is rendered inside the site skeleton, which has the theme loaded along with the nav bar and footer above and below it.

Your plugin should expose a single function via `module.exports`, which takes a [husky instance](/server/husky.js) and [utils object](/server/utils/index.js) as parameters.

If you want to serve static files, you can always mount them into `/app/static`.

Husky modifies [Koa](https://www.npmjs.com/package/koa)'s context:

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

```bash
# Setup your ENV, using the same environment variables from above
cp .env.example .env

# Startup a development redis database
# -> Runs on port 6379 on localhosts
docker-compose up -d

# Startup the dev server
# > This will watch for changes in /app and rebuild js/sass assets
# > This will NOT watch js for changes in /server, you need to restart it for that
# > This will recompile .pug templates when NODE_ENV=development is set
npm run dev

# Deploy docker images
# > Uses REGISTRY file & package version to tag the image and push to dockerhub
# > More info: https://docs.npmjs.com/cli/version
npm version # major | minor | patch
```

### Environment

The server behaves differently depending on what `NODE_ENV` is set

**development**

- `.pug` files will be compiled for each request, so you always get the latest version
- Requests to trello will not be cached
- `.js` & `.sass` assets will be hot-reloaded, meaning they will update in the browser on save

**production**

- `.pug` files will be compiled once at startup
- Requests to Trello will be cached for 10 minutes
- `.js` & `.css` assets will be optimised and minimised

## Ideas & further work

- Display card's attachments, for example:
  - A carousel of images
  - A preview of a git repo
  - Embedding a youtube video
- Use linked cards to nest pages and create a page hierarchy
- Different page templates
- Commenting / voting using the Trello API
- Use `No-Cache` headers rather than `?nocache`
- Use the board's theme to colour the site
