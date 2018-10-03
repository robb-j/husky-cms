const { join } = require('path')
const { existsSync } = require('fs')

const casex = require('casex')
const pug = require('pug')
const dayjs = require('dayjs')
const marked = require('marked')

const requiredConfig = [ 'TRELLO_APP_KEY', 'TRELLO_TOKEN', 'SITE_NAME' ]

const slug = str => casex(str, 'ca-sa')

function compilePug (name) {
  let paths = [
    join(__dirname, `templates/${name}.pug`),
    join(__dirname, `../plugins/templates/${name}.pug`)
  ]
  for (let path of paths) {
    if (!existsSync(path)) continue
    
    return process.env.NODE_ENV === 'development'
      ? (...args) => pug.compileFile(path)(...args)
      : pug.compileFile(path)
  }
  throw new Error(`Invalid template '${name}'`)
}

function processCard (card) {
  card.content = marked(card.desc)
  card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
}

module.exports = { slug, compilePug, processCard, requiredConfig }
