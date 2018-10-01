const Koa = require('koa')
const Router = require('koa-router')
// const koaSend = require('koa-send')
const koaStatic = require('koa-static')
const koaMount = require('koa-mount')
const json = require('koa-json')
const cors = require('@koa/cors')
const pug = require('pug')
const dayjs = require('dayjs')
const casex = require('casex')
const marked = require('marked')
const { join } = require('path')

const { fetchCards } = require('./trello')

const slug = str => casex(str, 'ca-sa')

const pageListId = process.env.PAGE_LIST
const projectListId = process.env.PROJECT_LIST
const blogListId = process.env.BLOG_LIST

const compilePug = path => pug.compileFile(
  join(__dirname, `templates/${path}.pug`)
)

let sitemode
if (!pageListId && !projectListId && blogListId) sitemode = 'blog'
else if (!pageListId && projectListId && !blogListId) sitemode = 'projects'
else if (!pageListId) console.log('PAGE_LIST is required') || process.exit(1)
else sitemode = 'all'

function makeTemplates () {
  return {
    page: compilePug('page'),
    projectList: compilePug('projectList'),
    project: compilePug('project'),
    blog: compilePug('blog'),
    blogPost: compilePug('blogPost'),
    notFound: compilePug('notFound')
  }
}

function processCard (card) {
  card.content = marked(card.desc)
  card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
}

function getSiteTree (cardPages) {
  let pages = []
  // const cardToTree = card => ({
  //   name: card.name, href: `/${slug(card.name)}`, type: 'page'
  // })
  
  const makeNode = (type, href, name) => ({ name, href, type })
  const cardToTree = card => makeNode('page', `/${slug(card.name)}`, card.name)
  
  if (sitemode !== 'all') {
    // Have a single page if in 'blog' or 'projects' mode
    pages.push(makeNode(sitemode, casex(sitemode, 'Ca Se'), '/'))
  } else {
    // If in 'all' mode, add any pages we can
    if (projectListId) pages.push(makeNode('projects', '/projects', 'Projects'))
    if (blogListId) pages.push(makeNode('blog', '/blog', 'Blog'))
    
    if (pageListId) {
      pages = pages.concat(
        cardPages.map(cardToTree)
      )
    }
  }
  
  // Filter out the root and/or home page
  return pages.filter(p => p.href !== '/' && p.href !== '/home')
}

async function pageRoute (ctx) {
  let pages = await fetchCards(pageListId)
  let sitetree = getSiteTree(pages)
  
  let pagename = ctx.params.page || 'home'
  let page = pages.find(p => slug(p.name) === pagename)
  
  if (page) {
    let content = marked(page.desc)
    ctx.renderPug('page', page.name, { page, sitetree, content })
  } else {
    ctx.notFound()
  }
}

async function blogRoute (ctx) {
  let pages = await fetchCards(pageListId)
  let sitetree = getSiteTree(pages)
  let posts = await fetchCards(blogListId)
  
  // Process posts
  posts.forEach(processCard)
  
  ctx.renderPug('blog', 'Blog', { posts, sitetree })
}

async function projectListRoute (ctx) {
  let pages = await fetchCards(pageListId)
  let sitetree = getSiteTree(pages)
  let projects = await fetchCards(projectListId)
  
  let parent = sitetree.find(p => p.type === 'projects')
  console.log(sitetree)
  
  // Process projects
  projects.forEach(processCard)
  
  if (!ctx.params.project) {
    ctx.renderPug('projectList', 'Projects', { projects, sitetree })
  } else {
    let project = projects.find(p => slug(p.name) === ctx.params.project)
    if (project) ctx.renderPug('project', project.name, { project, sitetree, parent })
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
  let templates = makeTemplates()
  
  app.context.notFound = function () {
    this.status = 404
    this.body = 'Not Found'
  }
  
  app.context.renderPug = function (template, title, data) {
    let render = process.env.NODE_ENV.startsWith('dev')
      ? compilePug(template)
      : templates[template]
    
    this.body = render(Object.assign(
      { site: 'r0b.io', title },
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
  
  router.get('/projects.json', async (ctx, next) => {
    let projects = await fetchCards(projectListId)
    projects.forEach(processCard)
    ctx.body = { projects }
  })
  
  if (sitemode === 'blog') {
    router.get('/', blogRoute)
  } else if (sitemode === 'projects') {
    router.get('/', projectListRoute)
    router.get('/:project', projectListRoute)
  } else {
    if (blogListId) {
      router.get('/blog', blogRoute)
    }
    
    if (projectListId) {
      router.get('/projects/:project', projectListRoute)
      router.get('/projects', projectListRoute)
    }
    
    router.get('/:page', pageRoute)
    router.get('/', pageRoute)
  }
  
  // let dist = new Router()
  // dist.use(koaStatic('dist'))
  // router.use('/dist', dist.routes())
  
  // router.get('/favicon.png', ctx => koaSend(ctx, 'static/favicon.png'))
  
  app.use(cors())
    .use(koaMount('/dist', koaStatic('dist')))
    .use(json({ pretty: false, param: 'pretty' }))
    .use(router.routes())
    .use(router.allowedMethods())
  
  return app
}

module.exports = { makeServer }
