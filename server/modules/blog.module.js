const { fetchCards } = require('../trello')
const { processCard } = require('../utils')

async function blogRoute (ctx) {
  const { sitetree } = ctx
  
  let posts = await fetchCards(process.env.BLOG_LIST, ctx.skipCache)
  
  posts.forEach(processCard)
  
  ctx.renderPug('blog', 'Blog', { posts, sitetree })
}

module.exports = function (husky) {
  husky.registerPageType('blog', {
    name: 'Blog',
    templates: [ 'blog' ],
    variables: [ 'BLOG_LIST' ],
    routes: {
      './': blogRoute
    }
  })
}
