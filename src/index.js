require('dotenv').config()
const { makeServer } = require('./server')

;(async () => {
  let app = makeServer()
  app.listen(3000)
  console.log('Listening on :3000')
})()
