const { readdirSync } = require('fs')
const { join } = require('path')

const casex = require('casex')
const dayjs = require('dayjs')
const axios = require('axios')
const redis = require('async-redis')

const utils = require('./utils')
const defaultModules = require('./modules')

/** Represents a set of plugin configuration */
class Husky {
  constructor() {
    this.pages = new Map()
    this.contentTypes = new Map()
    this.requestedLists = new Set()
    this.trello = axios.create({
      baseURL: 'https://api.trello.com/1',
      params: {
        key: process.env.TRELLO_APP_KEY,
        token: process.env.TRELLO_TOKEN
      }
    })
    if (process.env.REDIS_URL) {
      this.redis = redis.createClient(process.env.REDIS_URL)
    } else {
      this.redis = undefined
    }
    this.utils = utils
    this.inMemoryCache = new Map()
    this.setupJobs()
  }

  /** Load a Husky from a modules directory (absolute path) */
  static from(path) {
    let husky = new Husky()

    // Add the default modules
    Object.values(defaultModules).forEach(mod => mod(husky, utils))

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
  get templates() {
    return utils.collectArrayFromMap(this.pages, 'templates')
  }

  /** Get the pages which are active according to the environemt vars set */
  activePages() {
    let pages = new Map()
    this.pages.forEach((Page, type) => {
      if (Page.variables.some(name => process.env[name] === undefined)) return
      pages.set(type, Page)
    })
    return pages
  }

  /** Get the site mode based on the environemt vars set */
  getSitemode() {
    if (process.env.PAGE_LIST) return 'multi'

    // let active = this.activePages()
    //
    // if (active.length > 1) return 'multi'
    //
    // return active[0]

    let found = null
    this.pages.forEach((Page, type) => {
      if (found || Page.variables.some(v => process.env[v] === undefined))
        return
      found = type
    })

    return found
  }

  /** Adds a content html onto a card using ordered content parsers */
  processCard(card) {
    let blobs = []

    card.slug = utils.slug(card.name)

    // Process each content type into a html blob
    this.contentTypes.forEach((Content, type) => {
      blobs.push(Object.assign({ content: Content.parser(card) }, Content))
    })

    // Sort the blobs using their orderingg, lowest first
    blobs.sort((a, b) => a.order - b.order)

    const wrap = blob =>
      `<div class="content-${blob.type}">${blob.content}</div>`

    // Join up the blobs, optionally wrapping in a div, and place it on the card
    card.content = blobs.map(b => (b.noWrapper ? b.content : wrap(b))).join('')

    // Also add the timestamp to the card
    card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
  }

  /** Register a new page type */
  registerPage(type, Page) {
    Page.name = utils.undefOr(Page.name, casex(type, 'Ca Se'))
    Page.variables = Page.variables || []
    Page.templates = Page.templates || []
    Page.routes = Page.routes || {}
    this.pages.set(type, Page)
  }

  /** Register a content type, a way of processing a card into html */
  registerContentType(name, Content) {
    if (Content.order === undefined) Content.order = 25
    if (Content.noWrapper === undefined) Content.noWrapper = false
    Content.type = name
    this.contentTypes.set(name, Content)
  }

  setupJobs() {
    let interval = parseInt(process.env.POLL_INTERVAL, 10)
    if (Number.isNaN(interval)) interval = 5000

    setInterval(async () => {
      for (let listId of this.requestedLists) {
        await this.fetchAndCacheList(listId)
      }
    }, interval)
  }

  async fetchAndCacheList(listId) {
    const params = {
      fields:
        'desc,descData,labels,name,pos,url,idAttachmentCover,dateLastActivity',
      attachments: true,
      members: true
    }

    try {
      const result = await this.trello.get(`/lists/${listId}/cards`, { params })

      // return this.redis.set(`list_${listId}`, JSON.stringify(result.data))

      return this.storeValue(`list_${listId}`, result.data)
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        console.log(`Cannot connect to ${this.trello.config.baseURL}`)
      } else if (error.response) {
        console.log(error.message, error.response.data)
      } else {
        console.log(error)
      }
    }
  }

  async fetchCards(listId) {
    // If the list hasn't been requested, remember it and do an initial request
    if (!this.requestedLists.has(listId)) {
      this.requestedLists.add(listId)
      await this.fetchAndCacheList(listId)
    }

    // Return the parsed list
    return this.retrieveValue(`list_${listId}`, [])

    // return JSON.parse(await this.redis.get(`list_${listId}`) || '[]')
  }

  async storeValue(key, value) {
    console.log('#storeValue', key, value)
    if (this.redis) return this.redis.set(key, JSON.stringify(value))
    else return this.inMemoryCache.set(key, value)
  }

  async retrieveValue(key, defaultValue = undefined) {
    console.log('#retrieveValue', key, defaultValue)
    
    let value
    
    if (this.redis) {
      value = await this.redis.get(key)
      if (value) value = JSON.parse(value)
    } else {
      value = this.inMemoryCache.get(key)
    }
    
    // let value = this.redis
    //   ? await this.redis.get(key)
    //   : this.inMemoryCache.get(key)

    if (defaultValue !== undefined && value === undefined) return defaultValue

    return value
  }
}

module.exports = { Husky }
