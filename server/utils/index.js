//
// Utils: common utilities & functions for everyday use
// Also passed into module's for easy access w/o require-ing
//

// const casex = require('casex')
const { compilePug, makeTemplates } = require('./pug')

// Convert human text to a 'url-slug'
function slug(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

// Collect all the values from a specific field on map entries
function collectArrayFromMap(map, key) {
  let values = []
  map.forEach(item => {
    if (!Array.isArray(item[key])) return
    values = values.concat(item[key])
  })
  return values
}

function undefOr(value, fallback) {
  return value === undefined ? fallback : value
}

/** Work out if there is just one list id and collect list ids into an array */
function parseListIds(varName) {
  return {
    isSingular: !process.env[varName].includes(','),
    listIds: process.env[varName].split(',').map(str =>str.trim())
  }
}

/* Decide a name for the page
 * -> Default to the genericName
 * -> If multiple pages add the index onto the end
 * -> If genericName is '' do not set a name (so it doesn't show in the nav)
 */
function decidePageName(genericName, isSingular, i) {
  let name = genericName
  if (!isSingular) {
    name = genericName ? `${genericName} ${i + 1}` : ''
  }
  return name
}

module.exports = {
  slug,
  compilePug,
  collectArrayFromMap,
  makeTemplates,
  undefOr,
  parseListIds,
  decidePageName
}
