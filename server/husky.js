const casex = require('casex')

function collectFromMap (map, key) {
  let values = []
  map.forEach(item => {
    if (!Array.isArray(item[key])) return
    values = values.concat(item[key])
  })
  return values
}

class Husky {
  constructor () {
    this.pages = new Map()
    this.contentTypes = new Map()
  }
  
  get templates () {
    return collectFromMap(this.pages, 'templates')
  }
  
  getSitemode () {
    if (process.env.PAGE_LIST) return 'all'
    
    let found = null
    this.pages.forEach((Page, type) => {
      if (found || Page.variables.some(v => process.env[v] === undefined)) return
      found = type
    })
    
    return found
  }
  
  registerPageType (name, Page) {
    Page.name = Page.name || casex(name, 'Ca Se')
    Page.variables = Page.variables || []
    Page.templates = Page.templates || []
    Page.routes = Page.routes || {}
    this.pages.set(name, Page)
  }
  
  registerContentType (name, parser, options) {
    this.contentTypes.set(name, { parser, options })
  }
}

module.exports = { Husky }
