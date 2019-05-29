require('dotenv').config()

const { validateEnv } = require('valid-env')
const { makeServer } = require('./server')

validateEnv(['TRELLO_APP_KEY', 'TRELLO_TOKEN', 'REDIS_URL'])

// 
// App entry point
// 
;(async () => {
  try {
    let app = makeServer()
    app.listen(3000)
    console.log('Listening on :3000')
  } catch (error) {
    console.log('Husky Failed')
    console.log(error)
  }
})()
