const { join } = require('path')

const casex = require('casex')
const pug = require('pug')
const dayjs = require('dayjs')
const marked = require('marked')

const requiredConfig = [ 'TRELLO_APP_KEY', 'TRELLO_TOKEN', 'SITE_NAME' ]

const slug = str => casex(str, 'ca-sa')

const compilePug = path => pug.compileFile(
  join(__dirname, `templates/${path}.pug`)
)

function processCard (card) {
  card.content = marked(card.desc)
  card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
}

module.exports = { slug, compilePug, processCard, requiredConfig }
