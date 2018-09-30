const axios = require('axios')

const trello = axios.create({
  baseURL: 'https://api.trello.com/1',
  params: {
    key: process.env.TRELLO_APP_KEY,
    token: process.env.TRELLO_TOKEN
  }
})

function fetchCards (listId, name) {
  return trello.get(`/lists/${listId}/cards`, {
    params: {
      fields: 'desc,descData,labels,name,pos,url,idAttachmentCover,dateLastActivity',
      attachments: true,
      members: true
    }
  }).then(r => r.data)
}

module.exports = { trello, fetchCards }
