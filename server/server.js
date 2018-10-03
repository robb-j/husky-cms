const { readdirSync } = require('fs')
const { join } = require('path')

const Koa = require('koa')
const Router = require('koa-router')
const koaStatic = require('koa-static')
const koaMount = require('koa-mount')
const json = require('koa-json')
const cors = require('@koa/cors')
// const casex = require('casex')
const marked = require('marked')

const { fetchCards } = require('./trello')
const { slug, compilePug, requiredConfig } = require('./utils')
const { Husky } = require('./husky')
const defaultModules = require('./modules')

function makeTemplates (templateNames) {
  return templateNames.reduce((templates, value) => {
    templates[value] = compilePug(value)
    return templates
  }, {})
}

function makeSiteTree (pageCards, husky) {
  if (husky.getSitemode() !== 'all') return []
  
  let pages = []
  const makeNode = (type, href, name) => ({ name, href, type })
  const cardToTree = card => makeNode('page', `/${slug(card.name)}`, card.name)
  
  husky.pages.forEach((Page, type) => {
    pages.push(makeNode(type, `/${type}`, Page.name))
  })
  
  pages = pages.concat(pageCards.map(cardToTree))
  
  // Filter out the root and/or home page
  return pages.filter(p => p.href !== '/' && p.href !== '/home')
}

async function pageRoute (ctx) {
  let { pages, sitetree } = ctx
  
  let pagename = ctx.params.page || 'home'
  let page = pages.find(p => slug(p.name) === pagename)
  
  if (page) {
    let content = marked(page.desc)
    ctx.renderPug('page', page.name, { page, sitetree, content })
  } else {
    ctx.notFound()
  }
}

function loadHusky () {
  let path = join(__dirname, '..', 'plugins')
  
  let contents = readdirSync(path)
  
  let husky = new Husky()
  
  Object.values(defaultModules).forEach(
    mod => mod(husky)
  )
  
  contents.map(filename => {
    if (/^.*.js$/.test(filename) === false) return
    
    try {
      let fn = require(join(path, filename))
      
      if (typeof fn !== 'function') {
        throw new Error(`Bad plugin '${filename}'`)
      }
      
      fn(husky)
    } catch (error) {
      console.log(error)
    }
  })
  
  return husky
}

function makeServer () {
  let husky = loadHusky()
  
  // Find missing configuration
  const missing = requiredConfig.filter(name => process.env[name] === undefined)
  
  if (missing.length > 0) {
    console.log('Missing configuration:', missing.map(v => `'${v}'`).join(', '))
    process.exit(1)
  }
  
  const sitemode = husky.getSitemode()
  
  if (!sitemode) {
    console.log(`Missing configuration: 'PAGE_LIST'`)
    process.exit(1)
  }
  
  const app = new Koa()
  const router = new Router()
  let templates = makeTemplates([
    'page', 'blog', 'notFound', ...husky.templates
  ])
  
  app.context.notFound = function () {
    this.status = 404
    this.renderPug('notFound', 'Not Found')
  }
  
  app.context.renderPug = function (template, title, data = { sitetree: [] }) {
    let render = process.env.NODE_ENV === 'development'
      ? compilePug(template)
      : templates[template]
    
    this.body = render(Object.assign(
      { sitename: process.env.SITE_NAME, title },
      data
    ))
  }
  
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      console.log(err.message)
      ctx.status = err.status || 500
      ctx.body = { msg: err.message }
      ctx.app.emit('error', err, ctx)
    }
  })
  
  app.use(async (ctx, next) => {
    ctx.sitemode = sitemode
    ctx.skipCache = ctx.query.nocache !== undefined
    ctx.pages = await fetchCards(process.env.PAGE_LIST, ctx.skipCache)
    ctx.sitetree = makeSiteTree(ctx.pages, husky)
    ctx.husky = husky
    await next()
  })
  
  if (sitemode === 'all') {
    husky.pages.forEach((Page, pageName) => {
      if (Page.variables.some(name => process.env[name] === undefined)) return
      
      // Add the page's routes
      Object.keys(Page.routes).forEach(path => {
        let newPath = path.startsWith('./')
          ? `/${pageName}/${path.replace('./', '')}`
          : path
        console.log(newPath)
        router.get(newPath, Page.routes[path])
      })
    })
    
    // Add the page routes
    router.get('/:page', pageRoute)
    router.get('/', pageRoute)
  } else {
    let Page = husky.pages.get(sitemode)
    
    Object.keys(Page.routes).forEach(path => {
      router.get(path, Page.routes[path])
    })
  }
  
  // if (sitemode === 'blog') {
  //   router.get('/', blogRoute)
  // } else if (sitemode === 'projects') {
  //   router.get('/', projectListRoute)
  //   router.get('/:project', projectListRoute)
  // } else {
  //   if (blogListId) {
  //     router.get('/blog', blogRoute)
  //   }
  //
  //   if (projectListId) {
  //     router.get('/projects/:project', projectListRoute)
  //     router.get('/projects', projectListRoute)
  //   }
  //
  //   router.get('/:page', pageRoute)
  //   router.get('/', pageRoute)
  // }
  
  app.use(cors())
    .use(koaMount('/dist', koaStatic('dist')))
    .use(koaMount('/static', koaStatic('static')))
    .use(json({ pretty: false, param: 'pretty' }))
    .use(router.allowedMethods())
    .use(router.routes())
  
  return app
}

module.exports = { makeServer, loadHusky }
