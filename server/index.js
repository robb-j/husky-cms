require('dotenv').config()
const { makeServer } = require('./server')

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
