//
// Projects module
// Adds a page which uses a trello list as a filterable project showcase
//

const { slug } = require('../utils')

/** Get the tags/users to filter for on an array or projects */
function getFilters(projects) {
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

/** Add custom fields onto project cards */
function processProject(project, ctx, pageSlug) {
  ctx.husky.processCard(project)
  const base = ctx.sitemode === 'projects' ? '/' : `/${pageSlug}/`
  project.href = base + slug(project.name)
}

/** A koa route to render a project detail or project index page */
function projectListRoute(husky, listId, options) {
  const { pageSlug, pageTitle, pageSubtitle } = options
  
  return async ctx => {
    let projects = await husky.fetchCards(listId)

    // Get the parent page
    let parent = ctx.sitetree.find(p => p.type === 'projects')

    projects.forEach(p => processProject(p, ctx, pageSlug))

    // If not serving a specific project, return the index page
    if (!ctx.params.id) {
      const filters = getFilters(projects)
      
      ctx.renderPug('projectList', 'Projects', {
        endpoint: `/${pageSlug}.json`,
        filters,
        pageTitle,
        pageSubtitle
      })
    } else {
      // If a specific project was specified, render that project
      // Render it or fail if not found
      let project = projects.find(p => slug(p.name) === ctx.params.id)
      if (!project) return ctx.notFound()
      ctx.renderPug('project', project.name, { project, parent })
    }
  }
}

/** A koa route to serve the projects as a json array */
function projectJson(husky, listId, { pageSlug }) {
  return async ctx => {
    let projects = await husky.fetchCards(listId, ctx.skipCache)
    projects.forEach(p => processProject(p, ctx, pageSlug))
    ctx.body = { projects }
  }
}

// Register the plugin
module.exports = function(husky) {
  if (!process.env.PROJECT_LIST) return
  
  const isSingular = !process.env.PROJECT_LIST.includes(',')
  
  const listIds = process.env.PROJECT_LIST.split(',')
  const pageSlug = process.env.PROJECT_SLUG || 'project'
  const pageName = process.env.PROJECT_NAME || 'Projects'
  
  const pageTitle = process.env.PROJECT_TITLE || 'Projects'
  const pageSubtitle = process.env.PROJECT_SUBTITLE || 'Latest projects and contributions'
  
  for (let i in listIds) {
    let index = parseInt(i) + 1
    let listId = listIds[i]
    
    const identifier = isSingular ? pageSlug : `${pageSlug}_${index}`
    
    const options = {
      pageSlug: identifier,
      pageTitle,
      pageSubtitle,
      pageName
    }
    
    const routes = {}
    routes[`/${identifier}.json`] = projectJson(husky, listId, options)
    routes[`./:id`] = projectListRoute(husky, listId, options)
    routes[`./`] = projectListRoute(husky, listId, options)
    
    husky.registerPage(identifier, {
      name: isSingular ? pageName : `${pageName} ${index}`,
      templates: ['project', 'projectList'],
      variables: ['PROJECT_LIST'],
      routes
    })
  }
}
