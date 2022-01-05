// TODO: put all dom lookups at top
// TODO: incorporate mousedown behavior here too

(() => {
    let numBadClicks = 0
    let numGoodClicks = 0
    let numBlockedBadClicks = 0
    let numBlockedGoodClicks = 0
    let isTestStarted = false
    let gracePeriodS = 0.3
    let timeOfLastAppend = 0
    let numStartStop = 0

    let updateValue = (value, uiOnly) => {
        gracePeriodS = parseFloat(value)
        if (!uiOnly) {
            chrome.storage.sync.set({gracePeriodS})
        }
        document.getElementById('grace-period-value').innerHTML = `${value} seconds`
        document.getElementById('grace-period').value = value
        let speedPresets = Array.from(document.getElementById('speed-presets').children)
        speedPresets.forEach(elem => {
            if (parseFloat(elem.getAttribute('value')) === gracePeriodS) {
                elem.classList.add('selected')
            } else {
                elem.classList.remove('selected')
            }
        })
    }

    let linkClickHandler = e => {
        let elem = e.target
        let timeSinceLastAppend = Date.now() - timeOfLastAppend
        if (timeSinceLastAppend >= gracePeriodS * 1000) {
            if (elem._isClickMe) {
                numGoodClicks++
                document.getElementById('num-good-clicks').innerHTML = numGoodClicks
                elem.parentNode.classList.add('success')
            } else {
                numBadClicks++
                document.getElementById('num-bad-clicks').innerHTML = numBadClicks
                elem.parentNode.classList.add('fail')
            }
        } else {
            let feedback = document.getElementById('feedback')
            feedback.setAttribute('style', `top:${e.clientY};left:${e.clientX}`)
            feedback.classList.add('visible')
            setTimeout(() => {
                feedback.classList.remove('visible')
            }, 700)

            if (elem._isClickMe) {
                numBlockedGoodClicks++
                document.getElementById('num-blocked-good-clicks').innerHTML = numBlockedGoodClicks
            } else {
                numBlockedBadClicks++
                document.getElementById('num-blocked-bad-clicks').innerHTML = numBlockedBadClicks
            }
        }
    }

    let newResult = isClickMe => {
        let container = document.createElement('div')
        container.classList.add('result')
        let link = document.createElement('div')
        link.classList.add('link')
        link.innerHTML = isClickMe ? 'Click me' : 'Avoid me'
        link._isClickMe = isClickMe
        link.addEventListener('click', linkClickHandler, true)
        container.appendChild(link)
        timeOfLastAppend = Date.now()
        return container
    }

    let loopAddResults = (resultsContainer, isClickMe, startStopNumber) => {
        let timeoutMs = Math.floor(Math.random() * 1400) + 200
        setTimeout(() => {
            if (startStopNumber !== numStartStop) return
            let result = newResult(isClickMe)
            resultsContainer.prepend(result)
            loopAddResults(resultsContainer, !isClickMe, startStopNumber)
        }, timeoutMs)
    }

    let startTest = () => {
        isTestStarted = true
        numStartStop++
        let startTestButton = document.getElementById('start-test')
        startTestButton.classList.add('warn')
        startTestButton.innerHTML = 'Stop Test'
        let resultsContainer = document.getElementById('results-container')
        resultsContainer.classList.remove('hidden')

        loopAddResults(resultsContainer, true, numStartStop)
    }

    let stopTest = () => {
        isTestStarted = false
        numStartStop++
        let startTestButton = document.getElementById('start-test')
        startTestButton.classList.remove('warn')
        startTestButton.innerHTML = 'Start Test'
        let resultsContainer = document.getElementById('results-container')
        resultsContainer.classList.add('hidden')
        resultsContainer.innerHTML = ''
        numBadClicks = 0
        numGoodClicks = 0
        numBlockedBadClicks = 0
        numBlockedGoodClicks = 0
        document.getElementById('num-good-clicks').innerHTML = 0
        document.getElementById('num-bad-clicks').innerHTML = 0
        document.getElementById('num-blocked-good-clicks').innerHTML = 0
        document.getElementById('num-blocked-bad-clicks').innerHTML = 0
    }

    window.onload = () => {
        chrome.storage.sync.get(data => {
            if (data.gracePeriodS) {
                updateValue(data.gracePeriodS, true)
            }

            document.getElementById('grace-period').addEventListener('change', e => {
                updateValue(e.target.value)
            }, true)

            let speedPresets = Array.from(document.getElementById('speed-presets').children)
            speedPresets.forEach(elem => {
                elem.addEventListener('click', e => {
                    updateValue(e.target.getAttribute('value'))
                }, true)
            })

            document.getElementById('test-grace-period').addEventListener('click', e => {
                document.getElementById('demo-container').classList.remove('hidden')
                document.getElementById('test-grace-period').classList.add('hidden')
            }, true)

            document.getElementById('start-test').addEventListener('click', e => {
                if (isTestStarted) {
                    stopTest()
                } else {
                    startTest()
                }
            }, true)
        })
    }
})()

// TODO: later: add page for manually editing blacklist