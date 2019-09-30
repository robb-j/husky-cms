//
// Timeline module
// Adds page(s) which uses a trello list as a chronological timeline
//

const { undefOr, parseListIds, decidePageName } = require('../utils')

/** A koa route to render the timeline page */
function timelineRoute(husky, listId, options) {
  return async ctx => {
    let posts = await husky.fetchCards(listId)
    posts.forEach(card => ctx.husky.processCard(card))
    ctx.renderPug('timeline', 'Timeline', { posts, ...options })
  }
}

// Register the plugin
module.exports = function(husky) {
  if (!process.env.TIMELINE_LIST || !process.env.TIMELINE_DATE_ID) return

  const { isSingular, listIds } = parseListIds('TIMELINE_LIST')
  const dateId = process.env.TIMELINE_DATE_ID

  // Get the page slug and name from the environment, or use a default
  const pageSlug = undefOr(process.env.TIMELINE_SLUG, 'timeline')
  const pageName = undefOr(process.env.TIMELINE_NAME, 'Timeline')

  // Get the page title and subtitle from the environment, or use a default
  const pageTitle = undefOr(process.env.TIMELINE_TITLE, 'Project Timeline')
  const pageSubtitle = undefOr(
    process.env.TIMELINE_SUBTITLE,
    'Project timeline & milestones'
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
      pageName,
      dateId
    }

    // Register the page
    husky.registerPage(identifier, {
      name: decidePageName(pageName, isSingular, i),
      templates: ['timeline'],
      variables: ['TIMELINE_LIST'],
      routes: {
        './': timelineRoute(husky, listId, options)
      }
    })
  }
}
