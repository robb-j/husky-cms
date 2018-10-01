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
    .concat(proj.labels.map(label => `#${label.name || label.color}`))
    .concat(proj.members.map(member => `@${member.fullName}`))
}

function renderProjects (projects) {
  let elems = projects.map(proj => h(
    'div',
    { class: 'project-item column is-3' },
    [
      h('p', { class: 'project-title' }, proj.name),
      h('div', { class: 'content' }, proj.content),
      h('div', { class: 'tags' }, projectTags(proj).map(
        tag => h('span', { class: 'tag' }, tag)
      ))
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
