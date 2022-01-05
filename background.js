chrome.webNavigation.onCommitted.addListener(function(e) {
    chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
        for (let tab of tabs) {
            let url = new URL(tab.url)
            let hostname = url.hostname.replace(/^www\./, '')

            chrome.storage.sync.get(async data => {
                if (!data.blacklist) {
                    chrome.storage.sync.set({blacklist: []})
                } else {
                    if (hostname && data.blacklist.indexOf(hostname) === -1) {
                        chrome.tabs.sendMessage(tab.id, {msg: 'blockForHostname', hostname})
                    }
                }
            })
        }
    })
}, {url: [{schemes: ['http', 'https']}]})