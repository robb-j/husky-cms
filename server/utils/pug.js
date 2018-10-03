//
// Utilities related to pug templates & rendering
//

const { join } = require('path')
const { existsSync } = require('fs')
const pug = require('pug')

/** Compile a pug template using the templates and plugins directory paths */
function compilePug (name) {
  let paths = [
    join(__dirname, `../templates/${name}.pug`),
    join(__dirname, `../../plugins/templates/${name}.pug`)
  ]
  for (let path of paths) {
    if (!existsSync(path)) continue
    
    return process.env.NODE_ENV === 'development'
      ? (...args) => pug.compileFile(path)(...args)
      : pug.compileFile(path)
  }
  throw new Error(`Invalid template '${name}'`)
}

/** Make a hash map of name: compiled pug template */
function makeTemplates (templateNames) {
  return templateNames.reduce((templates, value) => {
    templates[value] = compilePug(value)
    return templates
  }, {})
}

module.exports = { compilePug, makeTemplates }
