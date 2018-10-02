const Koa = require('koa')
const Router = require('koa-router')
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

const requiredConfig = [ 'TRELLO_APP_KEY', 'TRELLO_TOKEN', 'SITE_NAME' ]

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
else sitemode = 'all'

function makeTemplates () {
  return {
    page: compilePug('page'),
    projectList: compilePug('projectList'),
    project: compilePug('project'),
    blog: compilePug('blog'),
    notFound: compilePug('notFound')
  }
}

function processCard (card) {
  card.content = marked(card.desc)
  card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
}

function processProject (project) {
  processCard(project)
  const base = sitemode === 'projects' ? '/' : '/projects/'
  project.href = base + slug(project.name)
}

function getSiteTree (cardPages) {
  let pages = []
  const makeNode = (type, href, name) => ({ name, href, type })
  const cardToTree = card => makeNode('page', `/${slug(card.name)}`, card.name)
  
  if (sitemode !== 'all') {
    // Have a single page if in 'blog' or 'projects' mode
    pages.push(makeNode(sitemode, '/', casex(sitemode, 'Ca Se')))
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
  let pages = await fetchCards(pageListId, ctx.query.nocache !== undefined)
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
  let pages = await fetchCards(pageListId, ctx.query.nocache !== undefined)
  let sitetree = getSiteTree(pages)
  let posts = await fetchCards(blogListId, ctx.query.nocache !== undefined)
  
  posts.forEach(processCard)
  
  ctx.renderPug('blog', 'Blog', { posts, sitetree })
}

function getFilters (projects) {
  let allTags = new Map()
  let allUsers = new Map()
  
  projects.forEach(project => {
    project.labels.forEach(label => allTags.set(label.id, label))
    project.members.forEach(member => allUsers.set(member.id, member))
  })
  
  return {
    tags: Array.from(allTags.values()),
    users: Array.from(allUsers.values())
  }
}

async function projectListRoute (ctx) {
  let pages = await fetchCards(pageListId, ctx.query.nocache !== undefined)
  let sitetree = getSiteTree(pages)
  let projects = await fetchCards(projectListId, ctx.query.nocache !== undefined)
  
  let parent = sitetree.find(p => p.type === 'projects')
  
  projects.forEach(processProject)
  
  if (!ctx.params.project) {
    const filters = getFilters(projects)
    ctx.renderPug('projectList', 'Projects', { projects, sitetree, filters })
  } else {
    let project = projects.find(p => slug(p.name) === ctx.params.project)
    if (project) {
      ctx.renderPug('project', project.name, { project, sitetree, parent })
    } else ctx.notFound()
  }
}

function makeServer () {
  // Find missing configuration
  let missing = requiredConfig.filter(name => process.env[name] === undefined)
  
  if (missing.length > 0) {
    console.log('Missing configuration:', missing.map(v => `'${v}'`).join(', '))
    process.exit(1)
  }
  
  if (sitemode === 'all' && !process.env.PAGE_LIST) {
    console.log(`Missing configuration: 'PAGE_LIST'`)
    process.exit(1)
  }
  
  const app = new Koa()
  const router = new Router()
  let templates = makeTemplates()
  
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
  
  router.get('/projects.json', async (ctx, next) => {
    let projects = await fetchCards(projectListId, ctx.query.nocache !== undefined)
    projects.forEach(processProject)
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
  
  app.use(cors())
    .use(koaMount('/dist', koaStatic('dist')))
    .use(koaMount('/static', koaStatic('static')))
    .use(json({ pretty: false, param: 'pretty' }))
    .use(router.routes())
    .use(router.allowedMethods())
  
  return app
}

module.exports = { makeServer }
