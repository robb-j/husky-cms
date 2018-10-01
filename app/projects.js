function h (tagName, attrs = {}, body = []) {
  let elem = document.createElement(tagName)

  for (let key in attrs) elem.setAttribute(key, attrs[key])

  if (Array.isArray(body)) {
    body.forEach(child => elem.appendChild(child))
  } else if (typeof body === 'string') {
    elem.innerHTML = body
  }

  return elem
}

function on (eventName, selector, callback) {
  document.querySelectorAll(selector).forEach(
    elem => elem.addEventListener(eventName, e => callback(e, elem))
  )
}

function fetchProjects () {
  return fetch('/projects.json')
    .then(r => r.json())
    .then(r => r.projects)
}

let projects = []

let filters = {
  tags: new window.Set([ ]),
  users: new window.Set()
}

function projectTags (proj) {
  return []
    .concat(proj.labels.map(label => ({
      name: `#${label.name || label.color}`, color: tagColors[label.color]
    })))
    .concat(proj.members.map(member => ({
      name: `@${member.fullName}`
    })))
}

function projectClasses (proj) {
  let classes = [ 'project-item' ]
  if (!projectIcon(proj)) classes.push('no-cover')
  return classes.join(' ')
}

function projectIcon (proj) {
  if (!proj.idAttachmentCover) return null
  let attachment = proj.attachments.find(a => a.id === proj.idAttachmentCover)
  if (!attachment) return
  return attachment.previews[4].url
}

function makeCover (proj) {
  let icon = projectIcon(proj)
  let attrs = { class: 'cover' }
  if (icon) attrs.style = `background-image: url(${icon})`
  return h('a', { href: proj.href }, [
    h('div', attrs)
  ])
}

const tagColors = {
  green: '#61BD4F',
  yellow: '#F2D600',
  orange: '#FF9F1A',
  red: '#EB5A46',
  purple: '#C377E0',
  blue: '#0079BF',
  sky: '#00C2E0',
  lime: '#51E897',
  pink: '#FF78CB',
  black: '#355263'
}

function makeTags (project) {
  let tags = projectTags(project)
  
  return h('div', { class: 'tags is-right' }, tags.map(
    tag => h('span', {
      class: 'tag is-info',
      style: tag.color && `background-color: ${tag.color}`
    }, tag.name)
  ))
}

function renderProjects (projects) {
  let elems = projects.map(proj => h(
    'div',
    { class: projectClasses(proj) },
    [
      h('div', { class: 'inner' }, [
        makeCover(proj),
        h('div', { class: 'info' }, [
          h('p', { class: 'name' }, [
            h('a', { href: proj.href }, proj.name)
          ]),
          // h('div', { class: 'content' }, proj.content),
          makeTags(proj)
        ])
      ])
    ]
  ))
  
  window.projects.innerHTML = ''
  elems.forEach(elem => window.projects.append(elem))
}

function updateFilters (projects) {
  if (filters.tags.size === 0 && filters.users.size === 0) {
    return renderProjects(projects)
  }
  
  renderProjects(projects.filter(project => {
    let keep = false
    
    if (filters.tags.size > 0) {
      if (project.labels.some(label => filters.tags.has(label.id))) {
        keep = true
      }
    }
    
    if (filters.users.size > 0) {
      if (project.members.some(member => filters.users.has(member.id))) {
        keep = true
      }
    }
    
    return keep
  }))
}

(() => {
  if (!fetch) {
    return alert('Sorry, your browser doesn\'t support this site')
  }
  
  on('click', '#filters .by-tag .tag', (e, elem) => {
    let id = elem.dataset.tag
    if (!filters.tags.has(id)) {
      filters.tags.add(id)
      elem.classList.add('is-active')
    } else {
      filters.tags.delete(id)
      elem.classList.remove('is-active')
    }
    
    updateFilters(projects)
  })
  
  on('click', '#filters .by-user .tag', (e, elem) => {
    let id = elem.dataset.user
    if (!filters.users.has(id)) {
      filters.users.add(id)
      elem.classList.add('is-active')
    } else {
      filters.users.delete(id)
      elem.classList.remove('is-active')
    }
    
    updateFilters(projects)
  })
  
  fetchProjects().then(result => {
    projects = result
    renderProjects(projects)
  })
})()
