let MAIN_CONTENT_ELEM
let TOGGLE_LABEL_ELEM
let HOSTNAME_ELEM
let TOGGLE_ONCE_ELEM

let whitelisted = false
let websiteName = ''
let paused = false

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
    if (!paused) {
        sendMessage({msg: 'pauseOnPage'})
        paused = true
        TOGGLE_ONCE_ELEM.classList.add('disabled')
    }
}

let toggleAlways = event => {
    chrome.storage.sync.get(data => {
        let whitelist = data.whitelist
        if (whitelisted) {
            sendMessage({msg: 'unwhitelist'})
            let index = whitelist.indexOf(websiteName)
            if (index !== -1) {
                whitelist.splice(index, 1)
            }
            MAIN_CONTENT_ELEM.classList.remove('whitelisted')
            TOGGLE_LABEL_ELEM.innerHTML = 'Pause on this site:'
        } else {
            sendMessage({msg: 'whitelist'})
            whitelist = (whitelist || []).concat([websiteName])
            MAIN_CONTENT_ELEM.classList.add('whitelisted')
            TOGGLE_LABEL_ELEM.innerHTML = 'Unpause on this site:'
        }

        whitelisted = !whitelisted
        chrome.storage.sync.set({whitelist})
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
        MAIN_CONTENT_ELEM = document.getElementById('main-content')
        TOGGLE_LABEL_ELEM = document.getElementById('toggle-label')
        HOSTNAME_ELEM = document.getElementById('hostname')
        TOGGLE_ONCE_ELEM = document.getElementById('toggle-once')

        websiteName = hostname

        if (hostname) {
            HOSTNAME_ELEM.innerHTML = hostname
            chrome.storage.sync.get(data => {
                if (data.whitelist.indexOf(hostname) !== -1) {
                    whitelisted = true
                    MAIN_CONTENT_ELEM.classList.add('whitelisted')
                    TOGGLE_LABEL_ELEM.innerHTML = 'Unpause on this site:'
                }
            })
        } else {
            MAIN_CONTENT_ELEM.classList.add('hidden')
            document.getElementById('alt-content').classList.remove('hidden')
        }

        TOGGLE_ONCE_ELEM.addEventListener('click', toggleOnce, true)

        let toggleAlwaysButton = document.getElementById('toggle-always')
        toggleAlwaysButton.addEventListener('click', toggleAlways, true)

        let settingsIcon = document.getElementById('settings')
        settingsIcon.addEventListener('click', goToSettings, true)

        chrome.runtime.onMessage.addListener(handleMessage)
    })
}
