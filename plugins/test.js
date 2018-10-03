// const { fetchCards } = require('../server/trello')
// const { processCard } = require('../server/utils')

async function papersRoute (ctx) {
  const { sitetree } = ctx
  
  // let papers = await fetchCards(process.env.PAPER_LIST, ctx.skipCache)
  
  // papers.forEach(processCard)
  
  ctx.renderPug('papers', 'Papers', { sitetree })
}

module.exports = function (husky) {
  husky.registerPageType('papers', {
    name: 'Academic Papers',
    templates: [ 'papers' ],
    variables: [ 'PAPER_LIST' ],
    routes: {
      './': papersRoute
    }
  })
}
