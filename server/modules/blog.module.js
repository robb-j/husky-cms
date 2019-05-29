//
// Blog module
// Adds a page which uses a trello list as a chronological blog
//

/** A koa route to render the blog page */
function blogRoute(husky) {
  return async ctx => {
    let posts = await husky.fetchCards(process.env.BLOG_LIST)
    posts.forEach(card => ctx.husky.processCard(card))
    ctx.renderPug('blog', 'Blog', { posts })
  }
}

// Register the plugin
module.exports = function(husky) {
  husky.registerPage('blog', {
    name: 'Blog',
    templates: ['blog'],
    variables: ['BLOG_LIST'],
    routes: {
      './': blogRoute(husky)
    }
  })
}
