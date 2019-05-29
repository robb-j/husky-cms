//
// Blog module
// Adds a page which uses a trello list as a chronological blog
//

const { fetchCards } = require('../utils')

/** A koa route to render the blog page */
async function blogRoute(ctx) {
  let posts = await fetchCards(process.env.BLOG_LIST, ctx.skipCache)
  posts.forEach(card => ctx.husky.processCard(card))
  ctx.renderPug('blog', 'Blog', { posts })
}

// Register the plugin
module.exports = function(husky) {
  husky.registerPageType('blog', {
    name: 'Blog',
    templates: ['blog'],
    variables: ['BLOG_LIST'],
    routes: {
      './': blogRoute
    }
  })
}
