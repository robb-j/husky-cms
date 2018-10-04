const { join } = require('path')

const Koa = require('koa')
const Router = require('koa-router')
const koaStatic = require('koa-static')
const koaMount = require('koa-mount')
const json = require('koa-json')
const cors = require('@koa/cors')

const utils = require('./utils')
const { Husky } = require('./husky')
const { slug, fetchCards, makeTemplates } = utils

function makeSiteTree (pageCards, husky) {
  const sitemode = husky.getSitemode()
  const makeNode = (type, href, name) => ({ name, href, type })
  const cardToTree = card => {
    let href = `/${slug(card.name)}`
    return makeNode('page', href === '/home' ? '/' : href, card.name)
  }
  
  if (sitemode !== 'all') {
    return [ makeNode(sitemode, '/', husky.pages.get(sitemode).name) ]
  }
  
  let pages = []
  
  husky.activePages().forEach((Page, type) => {
    pages.push(makeNode(type, `/${type}`, Page.name))
  })
  
  pages = pages.concat(pageCards.map(cardToTree))
  
  // Filter out the root and/or home page
  return pages
}

async function pageRoute (ctx) {
  let { pages } = ctx
  
  let pagename = ctx.params.page || 'home'
  let page = pages.find(p => slug(p.name) === pagename)
  
  if (page) {
    ctx.husky.processCard(page)
    ctx.renderPug('page', page.name, { page })
  } else {
    ctx.notFound()
  }
}

function makeServer () {
  let husky = Husky.from(
    join(__dirname, '..', 'plugins')
  )
  
  // Find missing configuration
  const requiredConfig = [ 'TRELLO_APP_KEY', 'TRELLO_TOKEN', 'SITE_NAME' ]
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
  
  // Create the Koa app to serve html
  const app = new Koa()
  const router = new Router()
  
  // Compile templates using the module's registered template too
  let templates = makeTemplates([
    'layout', 'page', 'blog', 'notFound', ...husky.templates
  ])
  
  // Add ctx#notFound method for easy 404 errors
  app.context.notFound = function () {
    this.status = 404
    this.renderPug('notFound', 'Not Found')
  }
  
  // Add ctx#renderPug method for pug rendering using templates
  app.context.renderPug = function (template, title, data = { }) {
    let renderLayout = templates['layout']
    let renderPage = templates[template]
    
    let base = {
      sitename: process.env.SITE_NAME, sitetree: this.sitetree, title
    }
    
    // Render the page
    let page = renderPage(Object.assign(base, data))
    
    // Render the full site with the page in it
    this.body = renderLayout(Object.assign(base, { page }))
  }
  
  // Catch errors and display them
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
  
  // Add ctx fields for module's use later
  app.use(async (ctx, next) => {
    ctx.sitemode = sitemode
    ctx.skipCache = ctx.query.nocache !== undefined
    ctx.pages = await fetchCards(process.env.PAGE_LIST, ctx.skipCache)
    ctx.sitetree = makeSiteTree(ctx.pages, husky)
    ctx.husky = husky
    await next()
  })
  
  //
  // Add routes based on the sitemode
  //
  
  // If showing all pages, add any routes we can
  // Add a module's routes if all it's variables are set
  if (sitemode === 'all') {
    husky.activePages().forEach((Page, type) => {
      Object.keys(Page.routes).forEach(path => {
        let newPath = path.startsWith('./')
          ? `/${type}/${path.replace('./', '')}`
          : path
        
        router.get(newPath, Page.routes[path])
      })
    })
    
    // Add the page routes
    router.get('/:page', pageRoute)
    router.get('/', pageRoute)
  } else {
    let Page = husky.pages.get(sitemode)
    
    // If only showing a single page, just render that module's routes
    Object.keys(Page.routes).forEach(path => {
      let newPath = path.replace(/^\.\//, '/')
      router.get(newPath, Page.routes[path])
    })
  }
  
  // Setup the app with cors, serving /dist & /static and using the router
  app.use(cors())
    .use(koaMount('/dist', koaStatic('dist')))
    .use(koaMount('/static', koaStatic('static')))
    .use(json({ pretty: false, param: 'pretty' }))
    .use(router.allowedMethods())
    .use(router.routes())
  
  return app
}

module.exports = { makeServer }
