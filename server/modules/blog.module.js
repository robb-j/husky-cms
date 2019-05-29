//
// Blog module
// Adds page(s) which uses a trello list as a chronological blog
//

const { undefOr, parseListIds, decidePageName } = require('../utils')

/** A koa route to render the blog page */
function blogRoute(husky, listId, options) {
  return async ctx => {
    let posts = await husky.fetchCards(listId)
    posts.forEach(card => ctx.husky.processCard(card))
    ctx.renderPug('blog', 'Blog', { posts, ...options })
  }
}

// Register the plugin
module.exports = function(husky) {
  if (!process.env.BLOG_LIST) return

  const { isSingular, listIds } = parseListIds('BLOG_LIST')
  
  // Get the page slug and name from the environment, or use a default
  const pageSlug = undefOr(process.env.BLOG_SLUG, 'blog')
  const pageName = undefOr(process.env.BLOG_NAME, 'Blog')
  
  // Get the page title and subtitle from the environment, or use a default
  const pageTitle = undefOr(process.env.BLOG_TITLE, 'Projects')
  const pageSubtitle = undefOr(
    process.env.BLOG_SUBTITLE,
    'Latest news & updates'
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
    
    // Register the page
    husky.registerPage(identifier, {
      name: decidePageName(pageName, isSingular, i),
      templates: ['blog'],
      variables: ['BLOG_LIST'],
      routes: {
        './': blogRoute(husky, listId, options)
      }
    })
  }
}
