# Husky CMS Ideas

This is a place to sketch out ideas for future features

## Plugins [Complete]

**plugin.js**

```js
module.exports = function myPlugin(Husky) {
  // Add a new page type
  Husky.registerPage('academic', {
    variables: ['PAPERS_LIST'],
    routes: {
      '/'(ctx, trello) {
        /* ... */
      },
      '/:paper'(ctx, trello) {
        /* ... */
      }
    }
  })

  // Add a content transformer
  Husky.registerContentType(
    'carousel',
    card => {
      if (card.attachments.length === 0) return
      let images = card.attachments.filter(a => a.type === 'image')
      let inner = images.map(i => `<img src=${i.url}>`)
      return `<div class="carousel">${inner}</div>`
    },
    { cardFields: 'attachments' }
  )
}
```
