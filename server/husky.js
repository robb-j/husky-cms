const { readdirSync } = require('fs')
const { join } = require('path')

const casex = require('casex')
const dayjs = require('dayjs')

const utils = require('./utils')
const defaultModules = require('./modules')

/** Represents a set of plugin configuration */
class Husky {
  constructor () {
    this.pages = new Map()
    this.contentTypes = new Map()
  }
  
  /** Load a Husky from a modules directory (absolute path) */
  static from (path) {
    let husky = new Husky()
    
    // Add the default modules
    Object.values(defaultModules).forEach(
      mod => mod(husky, utils)
    )
    
    // Loop through the module directory and look for modules
    readdirSync(path).map(filename => {
      if (/^.*.js$/.test(filename) === false) return
      
      try {
        // Try to require the .js file
        let fn = require(join(path, filename))
        
        // Fail if it didn't export a function
        if (typeof fn !== 'function') {
          throw new Error(`Bad plugin '${filename}'`)
        }
        
        // Call the function with the instance and utils
        fn(husky, utils)
      } catch (error) {
        console.log(error)
      }
    })
    
    return husky
  }
  
  /** Get all the registered templates */
  get templates () {
    return utils.collectArrayFromMap(this.pages, 'templates')
  }
  
  /** Get the pages which are active according to the environemt vars set */
  activePages () {
    let pages = new Map()
    this.pages.forEach((Page, type) => {
      if (Page.variables.some(name => process.env[name] === undefined)) return
      pages.set(type, Page)
    })
    return pages
  }
  
  /** Get the site mode based on the environemt vars set */
  getSitemode () {
    if (process.env.PAGE_LIST) return 'all'
    
    let found = null
    this.pages.forEach((Page, type) => {
      if (found || Page.variables.some(v => process.env[v] === undefined)) return
      found = type
    })
    
    return found
  }
  
  /** Adds a content html onto a card using ordered content parsers */
  processCard (card) {
    let blobs = []
    
    // Process each content type into a html blob
    this.contentTypes.forEach((Content, type) => {
      blobs.push(Object.assign({ content: Content.parser(card) }, Content))
    })
    
    // Sort the blobs using their orderingg, lowest first
    blobs.sort((a, b) => a.order - b.order)
    
    const wrap = blob => `<div class="content-${blob.type}">${blob.content}</div>`
    
    // Join up the blobs, optionally wrapping in a div, and place it on the card
    card.content = blobs
      .map(b => b.noWrapper ? b.content : wrap(b))
      .join('')
    
    // Also add the timestamp to the card
    card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
  }
  
  /** Register a new page type */
  registerPageType (name, Page) {
    Page.name = Page.name || casex(name, 'Ca Se')
    Page.variables = Page.variables || []
    Page.templates = Page.templates || []
    Page.routes = Page.routes || {}
    this.pages.set(name, Page)
  }
  
  /** Register a content type, a way of processing a card into html */
  registerContentType (name, Content) {
    if (Content.order === undefined) Content.order = 25
    if (Content.noWrapper === undefined) Content.noWrapper = false
    Content.type = name
    this.contentTypes.set(name, Content)
  }
}

module.exports = { Husky }
