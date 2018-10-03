//
// Trello utilities, helpers for accessing and manipulating Trello cards
//

const axios = require('axios')
const dayjs = require('dayjs')
const marked = require('marked')

const listsCache = new Map()

/** See if a list's card are already cached locally */
function checkListCache (listId) {
  let hit = listsCache.get(listId)
  if (!hit) return null
  
  let { expires, cards } = hit
  return dayjs(expires).isBefore(dayjs()) || process.env.NODE_ENV === 'development'
    ? null
    : cards
}

/** An axios client for accessing Trello with configured credentials */
const trello = axios.create({
  baseURL: 'https://api.trello.com/1',
  params: {
    key: process.env.TRELLO_APP_KEY,
    token: process.env.TRELLO_TOKEN
  }
})

/** Process a trello card, rendering markdown and adding it's formatted timestampe */
function processCard (card) {
  card.content = marked(card.desc)
  card.timestamp = dayjs(card.dateLastActivity).format('dddd D MMMM YYYY')
}

/** Fetch cards for a given Trello list */
async function fetchCards (listId, noCache = false) {
  if (!listId) return []
  
  let cached = checkListCache(listId)
  if (!noCache && cached) return cached
  
  let params = {
    fields: 'desc,descData,labels,name,pos,url,idAttachmentCover,dateLastActivity',
    attachments: true,
    members: true
  }
  
  let cards = await trello.get(`/lists/${listId}/cards`, { params })
    .then(r => r.data)
  
  listsCache.set(listId, {
    expires: dayjs().add(10, 'minute').toDate(),
    cards
  })
  
  return cards
}

module.exports = { listsCache, trello, processCard, fetchCards }
