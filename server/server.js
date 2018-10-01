const Koa = require('koa')
const Router = require('koa-router')
// const koaSend = require('koa-send')
const json = require('koa-json')
const cors = require('@koa/cors')
const pug = require('pug')
const casex = require('casex')
const { join } = require('path')

const { fetchCards } = require('./trello')

const slug = str => casex(str, 'ca-sa')

// function cardEndpoint (listId, name) {
//   return async (ctx, next) => {
//     if (!listId) ctx.throw(400, `${name} api disabled`)
//     ctx.body = {
//       [name]: await fetchCards(listId)
//     }
//   }
// }

const makeTemplate = p => pug.compileFile(join(__dirname, p))

const templates = {
  page: makeTemplate('templates/page.pug'),
  projectList: makeTemplate('templates/projectList.pug'),
  project: makeTemplate('templates/project.pug'),
  blog: makeTemplate('templates/blog.pug'),
  blogPost: makeTemplate('templates/blogPost.pug'),
  notFound: makeTemplate('templates/notFound.pug')
}

function getSiteTree (cardPages) {
  let pages = cardPages.map(p => ({
    name: p.name,
    href: '/' + slug(p.name)
  })).filter(p => p.href !== '/home')
  
  if (process.env.PROJECT_LIST) {
    pages.unshift({ href: '/projects', name: 'Projects' })
  }
  
  if (process.env.BLOG_LIST) {
    pages.unshift({ href: '/blog', name: 'Blog' })
  }
  
  return pages
}

async function pageRoute (ctx) {
  let pages = await fetchCards(process.env.PAGE_LIST)
  let tree = getSiteTree(pages)
  
  let pagename = ctx.params.page || 'home'
  let page = pages.find(p => slug(p.name) === pagename)
  
  if (page) {
    ctx.body = { page, tree }
  } else {
    ctx.notFound()
  }
}

async function blogRoute (ctx) {
  let pages = await fetchCards(process.env.PAGE_LIST)
  let tree = getSiteTree(pages)
  let posts = await fetchCards(process.env.BLOG_LIST)
  
  if (!ctx.params.post) {
    ctx.body = { posts, tree }
  } else {
    let post = posts.find(p => slug(p.name) === ctx.params.post)
    if (post) ctx.body = { post, tree }
    else ctx.notFound()
  }
}

async function projectListRoute (ctx) {
  let pages = await fetchCards(process.env.PAGE_LIST)
  let tree = getSiteTree(pages)
  let projects = await fetchCards(process.env.PROJECT_LIST)
  
  if (!ctx.params.project) {
    ctx.body = { projects, tree }
  } else {
    let project = projects.find(p => slug(p.name) === ctx.params.project)
    if (project) ctx.body = { project, tree }
    else ctx.notFound()
  }
}

function makeServer () {
  if (!process.env.TRELLO_APP_KEY || !process.env.TRELLO_TOKEN) {
    console.log('Invalid Trello auth')
    process.exit(1)
  }
  
  const app = new Koa()
  const router = new Router()
  
  app.context.notFound = function () {
    this.status = 404
    this.body = 'Not Found'
  }
  
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err.status || 500
      ctx.body = { msg: err.message }
      ctx.app.emit('error', err, ctx)
    }
  })
  
  if (process.env.PROJECT_LIST) {
    router.get('/projects', projectListRoute)
    router.get('/projects/:project', projectListRoute)
  }
  
  if (process.env.BLOG_LIST) {
    router.get('/blog/:post', blogRoute)
    router.get('/blog', blogRoute)
  }
  
  router.get('/:page', pageRoute)
  router.get('/', pageRoute)
  // router.get('/favicon.png', ctx => koaSend(ctx, 'static/favicon.png'))
  
  // router.get('/projects', cardEndpoint(process.env.PROJECT_LIST, 'projects'))
  // router.get('/pages', cardEndpoint(process.env.PAGE_LIST, 'pages'))
  // router.get('/blog', cardEndpoint(process.env.BLOG_LIST, 'blog'))
  
  app.use(cors())
    .use(json({ pretty: false, param: 'pretty' }))
    .use(router.routes())
    .use(router.allowedMethods())
  
  return app
}

module.exports = { makeServer }
