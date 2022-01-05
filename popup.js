let blacklisted = false

let sendMessage = request => {
  chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, request)
    }
  })
}

let getCurrentHostname = async callbackFn => {
  let result
  let [tab] = await chrome.tabs.query({active: true, currentWindow: true})
  let url = new URL(tab.url)
  if (url.protocol.slice(0, 4) !== 'http') {
    result = null
  } else {
    result = url.hostname.replace(/^www\./, '')
  }
  if (callbackFn) {
    callbackFn(result)
  }
  return result
}

let toggleOnce = event => {
  sendMessage({msg: 'pauseOnPage'})
}

let toggleAlways = event => {
  // TODO: update popup
  chrome.storage.sync.get(data => {
    let hostname = document.getElementById('hostname').innerHTML
    sendMessage({msg: 'blacklist'})
    let blacklist = (data.blacklist || []).concat([hostname])
    chrome.storage.sync.set({blacklist})
  })
}

let goToSettings = event => {
  window.open('options.html', '_blank')
}

let handleMessage = (request, sender, sendResponse) => {
    console.log(request.msg)
}

window.onload = () => {
  getCurrentHostname(hostname => {
    if (hostname) {
      document.getElementById('hostname').innerHTML = hostname
      chrome.storage.sync.get(data => {
        if (data.blacklist.indexOf(hostname) !== -1) {
          blacklisted = true
          document.getElementById('paused-label').setAttribute('style', 'display:block')

          // TODO: figure out SM for this, also find a better way to implement it
          document.getElementById('toggle-label').innerHTML = 'Unpause on this site:'
        }
      })
    } else {
      document.getElementById('main-content').classList.add('hidden')
      document.getElementById('alt-content').classList.remove('hidden')
    }
  })

  let toggleOnceButton = document.getElementById('toggle-once')
  toggleOnceButton.addEventListener('click', toggleOnce, true)

  let toggleAlwaysButton = document.getElementById('toggle-always')
  toggleAlwaysButton.addEventListener('click', toggleAlways, true)

  let settingsIcon = document.getElementById('settings')
  settingsIcon.addEventListener('click', goToSettings, true)

  chrome.runtime.onMessage.addListener(handleMessage)
}

