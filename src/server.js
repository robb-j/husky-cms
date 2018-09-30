const Koa = require('koa')
const Router = require('koa-router')
const json = require('koa-json')
const cors = require('@koa/cors')

const { fetchCards } = require('./trello')

function cardEndpoint (listId, name) {
  return async (ctx, next) => {
    if (!listId) ctx.throw(400, `${name} api disabled`)
    ctx.body = {
      [name]: await fetchCards(process.env.PAGE_LIST)
    }
  }
}

function makeServer () {
  const app = new Koa()
  const router = new Router()
  
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err.status || 500
      ctx.body = { msg: err.message }
      ctx.app.emit('error', err, ctx)
    }
  })
  
  router.get('/pages', cardEndpoint(process.env.PAGE_LIST, 'pages'))
  router.get('/projects', cardEndpoint(process.env.PAGE_LIST, 'projects'))
  router.get('/blog', cardEndpoint(process.env.PAGE_LIST, 'blog'))
  
  app.use(cors())
    .use(json({ pretty: false, param: 'pretty' }))
    .use(router.routes())
    .use(router.allowedMethods())
  
  return app
}

module.exports = { makeServer }
