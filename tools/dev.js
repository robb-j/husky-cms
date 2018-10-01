require('dotenv').config()

const { join } = require('path')
const { makeServer } = require('../server/server')
const Bundler = require('parcel-bundler')

let bundler = new Bundler(
  [
    join(__dirname, '../app/app.js'),
    join(__dirname, '../app/projects.js')
  ],
  { watch: true }
)

;(async () => {
  let server = makeServer()
  server.listen(3000)
  console.log('Listening on :3000')
  
  await bundler.bundle()
})()
