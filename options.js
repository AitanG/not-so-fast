(() => {
    let GRACE_PERIOD_VALUE_ELEM
    let GRACE_PERIOD_ELEM
    let SPEED_PRESETS_ELEM
    let FEEDBACK_ELEM
    let NUM_GOOD_CLICKS_ELEM
    let NUM_BAD_CLICKS_ELEM
    let NUM_BLOCKED_GOOD_CLICKS_ELEM
    let NUM_BLOCKED_BAD_CLICKS_ELEM
    let TEST_GRACE_PERIOD_ELEM
    let DEMO_CONTAINER_ELEM
    let START_TEST_ELEM
    let RESULTS_CONTAINER_ELEM

    let numBadClicks = 0
    let numGoodClicks = 0
    let numBlockedBadClicks = 0
    let numBlockedGoodClicks = 0
    let isTestStarted = false
    let gracePeriodS = 0.3
    let timeOfLastAppend = 0
    let numStartStop = 0
    let feedbackId = null

    let updateValue = (value, uiOnly) => {
        gracePeriodS = parseFloat(value)
        if (!uiOnly) {
            chrome.storage.sync.set({gracePeriodS})
        }
        GRACE_PERIOD_VALUE_ELEM.innerHTML = `${value} seconds`
        GRACE_PERIOD_ELEM.value = value
        let speedPresets = Array.from(SPEED_PRESETS_ELEM.children)
        speedPresets.forEach(elem => {
            if (parseFloat(elem.getAttribute('value')) === gracePeriodS) {
                elem.classList.add('selected')
            } else {
                elem.classList.remove('selected')
            }
        })
    }

    let showFeedback = (e, now) => {
        FEEDBACK_ELEM.setAttribute('style', `top:${e.clientY};left:${e.clientX}`)
        FEEDBACK_ELEM.classList.add('visible')
        feedbackId = now
        setTimeout(() => {
            if (now === feedbackId) {
                FEEDBACK_ELEM.classList.remove('visible')
            }
        }, 700)
    }

    let linkClickHandler = e => {
        let elem = e.target
        let now = Date.now()
        let timeSinceLastAppend = (elem._timeOfLastMousedown || now) - timeOfLastAppend
        if (timeSinceLastAppend >= gracePeriodS * 1000) {
            if (elem._isClickMe) {
                numGoodClicks++
                NUM_GOOD_CLICKS_ELEM.innerHTML = numGoodClicks
                elem.parentNode.classList.add('success')
            } else {
                numBadClicks++
                NUM_BAD_CLICKS_ELEM.innerHTML = numBadClicks
                elem.parentNode.classList.add('fail')
            }
        } else {
            showFeedback(e, now)
            if (elem._isClickMe) {
                numBlockedGoodClicks++
                NUM_BLOCKED_GOOD_CLICKS_ELEM.innerHTML = numBlockedGoodClicks
            } else {
                numBlockedBadClicks++
                NUM_BLOCKED_BAD_CLICKS_ELEM.innerHTML = numBlockedBadClicks
            }
        }
    }

    let linkMousedownHandler = e => {
        let elem = e.target
        let now = Date.now()
        let timeSinceLastAppend = now - timeOfLastAppend
        if (timeSinceLastAppend < gracePeriodS * 1000) {
            showFeedback(e, now)
        }
        elem._timeOfLastMousedown = now
    }

    let newResult = isClickMe => {
        let container = document.createElement('div')
        container.classList.add('result')
        let link = document.createElement('div')
        link.classList.add('link')
        link.innerHTML = isClickMe ? 'Click me' : 'Avoid me'
        link._isClickMe = isClickMe
        link.addEventListener('click', linkClickHandler, true)
        link.addEventListener('mousedown', linkMousedownHandler, true)
        container.appendChild(link)
        timeOfLastAppend = Date.now()
        return container
    }

    let loopAddResults = (isClickMe, startStopNumber) => {
        let timeoutMs = Math.floor(Math.random() * 1400) + 200
        setTimeout(() => {
            if (startStopNumber !== numStartStop) return
            let result = newResult(isClickMe)
            RESULTS_CONTAINER_ELEM.prepend(result)
            loopAddResults(!isClickMe, startStopNumber)
        }, timeoutMs)
    }

    let startTest = () => {
        isTestStarted = true
        numStartStop++
        START_TEST_ELEM.classList.add('warn')
        START_TEST_ELEM.innerHTML = 'Stop Test'
        RESULTS_CONTAINER_ELEM.classList.remove('hidden')

        loopAddResults(true, numStartStop)
    }

    let stopTest = () => {
        isTestStarted = false
        numStartStop++
        START_TEST_ELEM.classList.remove('warn')
        START_TEST_ELEM.innerHTML = 'Start Test'
        RESULTS_CONTAINER_ELEM.classList.add('hidden')
        RESULTS_CONTAINER_ELEM.innerHTML = ''
        numBadClicks = 0
        numGoodClicks = 0
        numBlockedBadClicks = 0
        numBlockedGoodClicks = 0
        NUM_GOOD_CLICKS_ELEM.innerHTML = 0
        NUM_BAD_CLICKS_ELEM.innerHTML = 0
        NUM_BLOCKED_GOOD_CLICKS_ELEM.innerHTML = 0
        NUM_BLOCKED_BAD_CLICKS_ELEM.innerHTML = 0
    }

    window.onload = () => {
        GRACE_PERIOD_VALUE_ELEM = document.getElementById('grace-period-value')
        GRACE_PERIOD_ELEM = document.getElementById('grace-period')
        SPEED_PRESETS_ELEM = document.getElementById('speed-presets')
        FEEDBACK_ELEM = document.getElementById('feedback')
        NUM_GOOD_CLICKS_ELEM = document.getElementById('num-good-clicks')
        NUM_BAD_CLICKS_ELEM = document.getElementById('num-bad-clicks')
        NUM_BLOCKED_GOOD_CLICKS_ELEM = document.getElementById('num-blocked-good-clicks')
        NUM_BLOCKED_BAD_CLICKS_ELEM = document.getElementById('num-blocked-bad-clicks')
        TEST_GRACE_PERIOD_ELEM = document.getElementById('test-grace-period')
        DEMO_CONTAINER_ELEM = document.getElementById('demo-container')
        START_TEST_ELEM = document.getElementById('start-test')
        RESULTS_CONTAINER_ELEM = document.getElementById('results-container')

        chrome.storage.sync.get(data => {
            if (data.gracePeriodS) {
                updateValue(data.gracePeriodS, true)
            }

            GRACE_PERIOD_ELEM.addEventListener('change', e => {
                updateValue(e.target.value)
            }, true)

            let speedPresets = Array.from(SPEED_PRESETS_ELEM.children)
            speedPresets.forEach(elem => {
                elem.addEventListener('click', e => {
                    updateValue(e.target.getAttribute('value'))
                }, true)
            })

            TEST_GRACE_PERIOD_ELEM.addEventListener('click', e => {
                DEMO_CONTAINER_ELEM.classList.remove('hidden')
                TEST_GRACE_PERIOD_ELEM.classList.add('hidden')
            }, true)

            START_TEST_ELEM.addEventListener('click', e => {
                if (isTestStarted) {
                    stopTest()
                } else {
                    startTest()
                }
            }, true)









            if (!data.whitelist) {
                chrome.storage.sync.set({whitelist: []})
            } else {
                console.log(data.whitelist)
            }
        })
    }
})()

// TODO: later: add page for manually editing whitelist