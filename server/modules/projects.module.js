//
// Projects module
// Adds page(s) which uses a trello list as a filterable project showcase
//

const { undefOr, parseListIds, decidePageName } = require('../utils')

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
  project.href = base + project.slug
}

/** A koa route to render a project detail or project index page */
function projectListRoute(husky, listId, options) {

  return async ctx => {
    let projects = await husky.fetchCards(listId)

    // Get the parent page
    let parent = ctx.sitetree.find(p => p.type === 'projects')

    projects.forEach(p => processProject(p, ctx, options.pageSlug))

    // If not serving a specific project, return the index page
    if (!ctx.params.id) {
      const filters = getFilters(projects)

      ctx.renderPug('projectList', 'Projects', {
        endpoint: `/${options.pageSlug}.json`,
        filters,
        ...options
      })
    } else {
      // If a specific project was specified, render that project
      // Render it or fail if not found
      let project = projects.find(p => p.slug === ctx.params.id)
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

  const { isSingular, listIds } = parseListIds('PROJECT_LIST')
  
  const pageSlug = undefOr(process.env.PROJECT_SLUG, 'project')
  const pageName = undefOr(process.env.PROJECT_NAME, 'Projects')

  const pageTitle = undefOr(process.env.PROJECT_TITLE, 'Projects')
  const pageSubtitle = undefOr(
    process.env.PROJECT_SUBTITLE,
    'Latest projects and contributions'
  )

  // Loop through each list id
  // -> We need 'i' as an integer
  for (let i = 0; i < listIds.length; i++) {
    let listId = listIds[i]

    // Decide a page identifier
    const identifier = isSingular ? pageSlug : `${pageSlug}_${i + 1}`

    // Group page options to be passed to pug
    const options = {
      pageSlug: identifier,
      pageTitle,
      pageSubtitle,
      pageName
    }
    
    // Generate page routes
    const routes = {}
    routes[`/${identifier}.json`] = projectJson(husky, listId, options)
    routes[`./:id`] = projectListRoute(husky, listId, options)
    routes[`./`] = projectListRoute(husky, listId, options)

    husky.registerPage(identifier, {
      name: decidePageName(pageName, isSingular, i),
      templates: ['project', 'projectList'],
      variables: ['PROJECT_LIST'],
      routes
    })
  }
}
