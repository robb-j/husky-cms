//
// Markdown Module
// Renders a page's description as markdown
//

const marked = require('marked')

module.exports = function(husky, utils) {
  husky.registerContentType('markdown', {
    parser: card => marked(card.desc),
    order: 50
  })
}
