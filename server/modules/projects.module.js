const { fetchCards } = require('../trello')
const { processCard, slug } = require('../utils')

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
  let { sitemode, sitetree } = ctx
  let projects = await fetchCards(projectListId, ctx.query.nocache !== undefined)

  let parent = sitetree.find(p => p.type === 'projects')
  console.log(sitetree)
  console.log(parent)

  projects.forEach(p => processProject(p, sitemode))

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

function processProject (project, sitemode) {
  processCard(project)
  const base = sitemode === 'projects' ? '/' : '/projects/'
  project.href = base + slug(project.name)
}

const projectListId = process.env.PROJECT_LIST

async function projectJson (ctx, next) {
  let projects = await fetchCards(projectListId, ctx.skipCache)
  projects.forEach(p => processProject(p, ctx.sitemode))
  ctx.body = { projects }
}

module.exports = function (husky) {
  husky.registerPageType('projects', {
    name: 'Projects',
    templates: [ 'project', 'projectList' ],
    variables: [ 'PROJECT_LIST' ],
    routes: {
      '/projects.json': projectJson,
      './': projectListRoute,
      './:project': projectListRoute
    }
  })
}
