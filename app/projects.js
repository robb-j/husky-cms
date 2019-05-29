/** A map of label colour to hex value */
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

/** Render html elements w/ attributes and children / html content */
function h(tagName, attrs = {}, body = []) {
  let elem = document.createElement(tagName)

  for (let key in attrs) elem.setAttribute(key, attrs[key])

  if (Array.isArray(body)) {
    body.forEach(child => elem.appendChild(child))
  } else if (typeof body === 'string') {
    elem.innerHTML = body
  }

  return elem
}

/** Register event handlers against a css selector */
function on(eventName, selector, callback) {
  document
    .querySelectorAll(selector)
    .forEach(elem => elem.addEventListener(eventName, e => callback(e, elem)))
}

/** Fetch projects from the server */
function fetchProjects() {
  return window.fetch(window.projectList.dataset.endpoint)
    .then(r => r.json())
    .then(r => r.projects)
}

/** Generate tags for a given project */
function projectTags(proj) {
  return []
    .concat(
      proj.labels.map(label => ({
        name: `#${label.name || label.color}`,
        color: tagColors[label.color]
      }))
    )
    .concat(
      proj.members.map(member => ({
        name: `@${member.fullName}`
      }))
    )
}

/** Generate html classes for a given project */
function projectClasses(proj) {
  let classes = ['project-item']
  if (!projectIcon(proj)) classes.push('no-cover')
  return classes.join(' ')
}

/** Get a project's icon url */
function projectIcon(proj) {
  if (!proj.idAttachmentCover) return null
  let attachment = proj.attachments.find(a => a.id === proj.idAttachmentCover)
  if (!attachment) return
  return attachment.previews[4].url
}

/** Make a project's cover DOM element */
function makeProjectCover(proj) {
  let icon = projectIcon(proj)
  let attrs = { class: 'cover' }
  if (icon) attrs.style = `background-image: url(${icon})`
  return h('a', { href: proj.href }, [h('div', attrs)])
}

/** Make a project's tags DOM element */
function makeProjectTags(project) {
  let tags = projectTags(project)

  return h(
    'div',
    { class: 'tags is-right' },
    tags.map(tag =>
      h(
        'span',
        {
          class: 'tag is-info',
          style: tag.color && `background-color: ${tag.color}`
        },
        tag.name
      )
    )
  )
}

/** Render an array of projects to DOM elements */
function renderProjects(projects) {
  let elems = projects.map(proj =>
    h('div', { class: projectClasses(proj) }, [
      h('div', { class: 'inner' }, [
        makeProjectCover(proj),
        h('div', { class: 'info' }, [
          h('p', { class: 'name' }, [h('a', { href: proj.href }, proj.name)]),
          makeProjectTags(proj)
        ])
      ])
    ])
  )

  // Reset the project element and add new children
  window.projects.innerHTML = ''
  elems.forEach(elem => window.projects.append(elem))
}

/** Render projects based on the given filters */
function updateFilters(projects, filters) {
  // Do nothing if there are no filters
  if (filters.tags.size === 0 && filters.users.size === 0) {
    return renderProjects(projects)
  }

  // Render the projects which match any of the filters
  renderProjects(
    projects.filter(project => {
      let keep = false

      keep |=
        filters.tags.size > 0 &&
        project.labels.some(label => filters.tags.has(label.id))

      keep |=
        filters.users.size > 0 &&
        project.members.some(member => filters.users.has(member.id))

      return keep
    })
  )
}

/** Toggle a tag elemtn and update its respective filter */
const toggleTag = (elem, idKey, set) => {
  let id = elem.dataset[idKey]
  if (!set.has(id)) {
    set.add(id)
    elem.classList.add('is-active')
  } else {
    set.delete(id)
    elem.classList.remove('is-active')
  }
}

;(() => {
  if (!window.projectList || !window.projects) return
  if (!window.fetch) return window.alert(`Sorry, your browser doesn't support this site`)

  let projects = []

  let filters = {
    tags: new window.Set([]),
    users: new window.Set()
  }

  // Toggle tag selection on click & re-render
  on('click', '#filters .by-tag .tag', (e, elem) => {
    toggleTag(elem, 'tag', filters.tags)
    updateFilters(projects, filters)
  })

  // Toggle user selection on click & re-render
  on('click', '#filters .by-user .tag', (e, elem) => {
    toggleTag(elem, 'user', filters.users)
    updateFilters(projects, filters)
  })

  // Fetch projects, store them & render
  fetchProjects().then(result => {
    projects = result
    renderProjects(projects)
  })
})()
