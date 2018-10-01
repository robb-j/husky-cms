const pug = require('pug')
const casex = require('casex')
const dayjs = require('dayjs')
const marked = require('marked')
const { join } = require('path')

export const slug = str => casex(str, 'ca-sa')

export const compilePug = path => pug.compileFile(
  join(__dirname, `templates/${path}.pug`)
)

export const findSitemode = (pageListId, projectListId, blogListId) => {
  if (!pageListId && !projectListId && blogListId) return 'blog'
  else if (!pageListId && projectListId && !blogListId) return 'projects'
  else if (!pageListId) console.log('PAGE_LIST is required') || process.exit(1)
  else return 'all'
}

export function processCard (card) {
  card.content = marked(card.desc)
  card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
}
