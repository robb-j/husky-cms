require('dotenv').config()
const { makeServer, loadHusky } = require('./server')

;(async () => {
  let app = makeServer()
  app.listen(3000)
  console.log('Listening on :3000')
})()

// ;(async () => {
//   try {
//     let h = await loadHusky()
//     console.log(h.templates)
//     console.log(h.variables)
//   } catch (err) {
//     console.log(err)
//   }
// })()
