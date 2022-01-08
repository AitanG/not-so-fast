chrome.webNavigation.onCommitted.addListener(function(e) {
    chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
        for (let tab of tabs) {
            let url = new URL(tab.url)
            let hostname = url.hostname.replace(/^www\./, '')

            chrome.storage.sync.get(async data => {
                if (!data.whitelist) {
                    chrome.storage.sync.set({whitelist: []})
                } else {
                    if (hostname && data.whitelist.indexOf(hostname) === -1) {
                        chrome.tabs.sendMessage(tab.id, {msg: 'blockForHostname', hostname})
                    }
                }
            })
        }
    })
}, {url: [{schemes: ['http', 'https']}]})