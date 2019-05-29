//
// Utils: common utilities & functions for everyday use
// Also passed into module's for easy access w/o require-ing
//

const casex = require('casex')
const { compilePug, makeTemplates } = require('./pug')

// Convert human text toa 'url-slug'
const slug = str => casex(str, 'ca-sa')

// Collect all the values from a specific field on map entries
function collectArrayFromMap(map, key) {
  let values = []
  map.forEach(item => {
    if (!Array.isArray(item[key])) return
    values = values.concat(item[key])
  })
  return values
}

module.exports = {
  slug,
  compilePug,
  collectArrayFromMap,
  makeTemplates
}
