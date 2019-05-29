//
// Projects module
// Adds a page which uses a trello list as a filterable project showcase
//

const { slug } = require('../utils')
const projectListId = process.env.PROJECT_LIST

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
function processProject(project, ctx) {
  ctx.husky.processCard(project)
  const base = ctx.sitemode === 'projects' ? '/' : '/projects/'
  project.href = base + slug(project.name)
}

/** A koa route to render a project detail or project index page */
function projectListRoute(husky) {
  return async ctx => {
    let projects = await husky.fetchCards(projectListId)
    console.log('projects', projects)

    // Get the parent page
    let parent = ctx.sitetree.find(p => p.type === 'projects')

    projects.forEach(p => processProject(p, ctx))

    // If not serving a specific project, return the index page
    if (!ctx.params.project) {
      const filters = getFilters(projects)
      ctx.renderPug('projectList', 'Projects', { projects, filters })
    } else {
      // If a specific project was specified, render that project
      // Render it or fail if not found
      let project = projects.find(p => slug(p.name) === ctx.params.project)
      if (!project) return ctx.notFound()
      ctx.renderPug('project', project.name, { project, parent })
    }
  }
}

/** A koa route to serve the projects as a json array */
function projectJson(husky) {
  return async ctx => {
    let projects = await husky.fetchCards(projectListId, ctx.skipCache)
    projects.forEach(p => processProject(p, ctx))
    ctx.body = { projects }
  }
}

// Register the plugin
module.exports = function(husky) {
  husky.registerPageType('projects', {
    name: 'Projects',
    templates: ['project', 'projectList'],
    variables: ['PROJECT_LIST'],
    routes: {
      '/projects.json': projectJson(husky),
      './:project': projectListRoute(husky),
      './': projectListRoute(husky)
    }
  })
}
