(() => {
    let MAX_ITER_TIME_MS = 5
    let UPDATE_DELAY_MS = 50     // Make sure delayMs is short enough that "blinking" elements don't throw it off
    let GRACE_PERIOD_CYCLES = 6  // Updated by Chrome storage. Extra slow: 0.6, slow: 0.5, normal: 0.3, fast: 0.2, extra fast: 0.15
    let MOUSE_STATIONARY_MS = GRACE_PERIOD_CYCLES * UPDATE_DELAY_MS  // Should really be the same as grace period?


    // `addEventListener()` overwrite inspired by Stack Overflow answer:
    // https://stackoverflow.com/questions/446892/how-to-find-event-listeners-on-a-dom-node-in-javascript-or-in-debugging
    // Used to keep a list of attached event listeners--this was supposed to be a native
    // JavaScript feature, but here we are...
    HTMLElement.prototype._addEventListener = HTMLElement.prototype.addEventListener
    HTMLElement.prototype._removeEventListener = HTMLElement.prototype.removeEventListener


    HTMLElement.prototype.addEventListener = function(eventType, listener, options) {
        let self = this
        self._addEventListener(eventType, listener, options) 
        if (eventType === 'click') {
            if (!self._clickListeners) {
                self._clickListeners = new Array()
            }
            self._clickListeners.push({eventType, listener, options})
        } else if (eventType === 'mousedown') {
            if (!self._mousedownListeners) {
                self._mousedownListeners = new Array()
            }
            self._mousedownListeners.push({eventType, listener, options})
        }
    }


    HTMLElement.prototype.removeEventListener = function(eventType, listener, options) {
        let self = this
        self._removeEventListener(eventType, listener, options) 
        if (eventType === 'click') {
            if (!self._clickListeners) {
                self._clickListeners = new Array()
            }
            let index = self._clickListeners.indexOf(listener)
            if (index !== -1) {
                self._clickListeners.splice(index, 1)
            }
        } else if (eventType === 'mousedown') {
            if (!self._mousedownListeners) {
                self._mousedownListeners = new Array()
            }
            let index = self._mousedownListeners.indexOf(listener)
            if (index !== -1) {
                self._mousedownListeners.splice(index, 1)
            }
        }
    }


    // Globals
    let pauseOnPage = false
    let curMousePosition = [-1, -1]
    let lastNHoverElems = Array(GRACE_PERIOD_CYCLES)
    let bufferIndex = -1
    let timeOfMostRecentMouseMoveMs = 0
    let loading = true
    let feedbackElem = null
    let isBlockingAllClicks = true
    let elemsToBlockFromMousedown = new Set()


    let arrayEquals = (a, b) => a.length === b.length && a.every((val, index) => val === b[index])


    let isMouseStationary = () => Date.now() - timeOfMostRecentMouseMoveMs > MOUSE_STATIONARY_MS


    let areDifferent = (hoverElems, eventPath) => {
        if (hoverElems === undefined) return false  // don't block until buffer is full
        if (hoverElems.length !== eventPath.length - 1) return true
        for (let i = 0; i < hoverElems.length; i++) {
            if (hoverElems[i] !== eventPath[i]) return true
        }
        return false
    }

    // Note: We block if the elements themselves are different, ignoring any
    // potential changes in click behavior. Tracking click behavior is
    // impossible to do accurately, and elements are a good heuristic--plus,
    // if click behavior changes from under the user's mouse, the user wouldn't
    // be able to see that happen anyway, which would be a whole other problem.
    let shouldBlock = event => (
        event.target._hovering
        && isMouseStationary()
        && areDifferent(lastNHoverElems[(bufferIndex + 1) % GRACE_PERIOD_CYCLES], event.path)
    )


    let maybeResetUnhoveredElems = hoverElems => {
        // Stop intercepting events for any elements no longer being hovered.
        // Instead of removing special event handlers, we can do this easily
        // by just setting `_hovering` to false.
        let prevHoverElems = lastNHoverElems[(bufferIndex - 1) % GRACE_PERIOD_CYCLES]
        if (prevHoverElems) {
            let elementsLeft = prevHoverElems.filter(x => !hoverElems.includes(x))
            elementsLeft.forEach(elem => elem._hovering = false)
        }
    }


    let replaceHandler = (elem, oldHandler, newHandler, listenerInfo) => {
        elem._removeEventListener(listenerInfo.eventType, oldHandler, listenerInfo.options)
        elem._addEventListener(listenerInfo.eventType, newHandler, listenerInfo.options)
        listenerInfo.listener = newHandler
    }


    let showFeedback = () => {
        if (feedbackElem) {
            feedbackElem.setAttribute('style', `top:${curMousePosition[1]};left:${curMousePosition[0]}`)
            feedbackElem.classList.add('not-so-fast__visible')
            setTimeout(() => {
                feedbackElem.classList.remove('not-so-fast__visible')
            }, 700)
        }
    }


    let interceptJsMousedownEvent = (elem, listenerInfo) => {
        // For JS handlers, you have to override every handler to block.

        // Special case for mousedown events: If a mousedown falls within
        // the grace period, block the click too. This is important,
        // because clicks can take arbitrarily long before the mouseup.

        // Must create new copy of handler each time
        let wrappedMousedownHandler = event => {
            let block = shouldBlock(event)
            if (block) {
                event.preventDefault()
                elemsToBlockFromMousedown.add(event.target)
                showFeedback()
            }
            replaceHandler(event.target, wrappedMousedownHandler, listenerInfo.listener, listenerInfo)  // unwrap
            if (!block && listenerInfo.listener) listenerInfo.listener(event)
        }
        // Label new handler as a wrapper so we don't wrap it again
        wrappedMousedownHandler._isWrapper = true
        replaceHandler(elem, listenerInfo.listener, wrappedMousedownHandler, listenerInfo)  // wrap
    }


    let interceptJsClickEvent = (elem, listenerInfo) => {
        // For JS handlers, you have to override every handler to block.

        // Must create new copy of handler each time
        let wrappedClickHandler = event => {
            let block = elemsToBlockFromMousedown.has(event.target)
            if (block) {
                event.preventDefault()
                showFeedback()
            }
            replaceHandler(event.target, wrappedClickHandler, listenerInfo.listener, listenerInfo)  // unwrap
            if (!block && listenerInfo.listener) listenerInfo.listener(event)
        }
        // Label new handler as a wrapper so we don't wrap it again
        wrappedClickHandler._isWrapper = true
        replaceHandler(elem, listenerInfo.listener, wrappedClickHandler, listenerInfo)  // wrap
    }


    let interceptHtmlMousedownEvent = elem => {
        // For HTML handlers, you just have to create one JS handler that calls `event.stopPropagation()` to block.

        // Special case for mousedown events: If a mousedown falls within
        // the grace period, block the click too. This is important,
        // because clicks can take arbitrarily long before the mouseup.

        // Must create new copy of handler each time
        let onmousedownInterceptor = event => {
            let block = shouldBlock(event)
            if (block) {
                event.stopPropagation()
                event.preventDefault()
                elemsToBlockFromMousedown.add(event.target)
                showFeedback()
            }
            event.target._hasOnmousedownInterceptor = false
            event.target._removeEventListener('mousedown', onmousedownInterceptor, true)
        }
        // Make a note that this elem has a special handler so we don't add it again
        elem._hasOnmousedownInterceptor = true
        elem._addEventListener('mousedown', onmousedownInterceptor, true)
    }


    let interceptHtmlClickEvent = elem => {
        // For HTML handlers, you just have to create one JS handler that calls `event.stopPropagation()` to block.

        // Must create new copy of handler each time
        let onclickInterceptor = event => {
            let block = elemsToBlockFromMousedown.has(event.target)
            if (block) {
                event.stopPropagation()
                event.preventDefault()
                showFeedback()
            }
            event.target._hasOnclickInterceptor = false
            event.target._removeEventListener('click', onclickInterceptor, true)
        }
        // Make a note that this elem has a special handler so we don't add it again
        elem._hasOnclickInterceptor = true
        elem._addEventListener('click', onclickInterceptor, true)
    }


    let getAncestors = node => {
        let result = []
        while (node) {
            result.push(node)
            node = node.parentNode
        }
        return result
    }


    let blockAllClicksHandler = event => {
        event.stopPropagation()
        event.preventDefault()
    }


    let updateMousePosHandler = event => {
        timeOfMostRecentMouseMoveMs = Date.now()
        curMousePosition[0] = event.clientX
        curMousePosition[1] = event.clientY
    }


    let maybeExitLoop = (iterTimeMs, hoverElems) => {
        if (!loading && iterTimeMs > MAX_ITER_TIME_MS) {
            // Stop extension completely for pages where it's taking too long
            console.log(`Extension taking too long (${iterTimeMs}ms > ${MAX_ITER_TIME_MS}ms). Disabling for page.`)
            document.removeEventListener('click', blockAllClicksHandler, true)
            document.removeEventListener('mousedown', blockAllClicksHandler, true)
            document.removeEventListener('mouseup', blockAllClicksHandler, true)
            document.removeEventListener('mousemove', updateMousePosHandler, true)
            // Reset currently hovered elems too
            bufferIndex++
            maybeResetUnhoveredElems(hoverElems)
            return true
        }
        return false
    }


    let runLoop = lastIterTimeMs => {
        // Grace period is GRACE_PERIOD_CYCLES * UPDATE_DELAY_MS
        // Have to update more frequently than grace period because handlers might change
        // There's still a slim possibility that your intercept event is overridden
        setTimeout(() => {
            let hoverElems = getAncestors(document.elementFromPoint(...curMousePosition))

            // Stop extension completely for pages where it's taking too long.
            // Ignore the above code because it sometimes takes too long and we assume that's OK.
            let start = Date.now()
            bufferIndex++
            lastNHoverElems[bufferIndex % GRACE_PERIOD_CYCLES] = hoverElems

            if (isBlockingAllClicks
                && lastNHoverElems[GRACE_PERIOD_CYCLES - 1]) {
                // We're ready to handle clicks once everything is set
                document.removeEventListener('click', blockAllClicksHandler, true)
                document.removeEventListener('mousedown', blockAllClicksHandler, true)
                document.removeEventListener('mouseup', blockAllClicksHandler, true)
                isBlockingAllClicks = false
            }

            // Stop intercepting events for any elements no longer being hovered
            maybeResetUnhoveredElems(hoverElems)

            // Don't attach new interceptors if we're pausing, but keep looping in case of unpause
            if (!pauseOnPage) {
                // Intercept events for elements we're currently hovering on.
                // Only do this when no recent mouse moves.

                // Edge case: clicking on an element within an anchor tag follows
                // the link without registering a click on the <a> element itself.
                let anchorIndex = hoverElems.findIndex(e => e.nodeName === 'A')

                hoverElems.forEach((elem, i) => {
                    elem._hovering = true

                    // Intercept click listeners
                    let needsMousedownWrapper = false
                    if (!elem._hasOnclickInterceptor) {
                        if (i <= anchorIndex || elem.onclick || elem.href || elem.nodeName === 'BUTTON' || elem.nodeName === 'INPUT') {
                            // Overriding click events also prevents anchor from being followed!
                            interceptHtmlClickEvent(elem)
                            needsMousedownWrapper = true
                        }
                    }
                    if (elem._clickListeners) {
                        elem._clickListeners.forEach(listenerInfo => {
                            if (!listenerInfo.listener._isWrapper) {
                                interceptJsClickEvent(elem, listenerInfo)
                            }
                        })
                        needsMousedownWrapper = true
                    }

                    // Intercept mousedown listeners
                    if (elem.onmousedown) {
                        if (!elem._hasOnmousedownInterceptor) {
                            interceptHtmlMousedownEvent(elem)
                        }
                        needsMousedownWrapper = false
                    }
                    if (elem._mousedownListeners) {
                        elem._mousedownListeners.forEach(listenerInfo => {
                            if (!listenerInfo.listener._isWrapper) {
                                interceptJsMousedownEvent(elem, listenerInfo)
                            }
                        })
                        needsMousedownWrapper = false
                    }

                    // Intercept mousedown events if intercepting clicks.
                    // Even if there are no mousedown events to block, we
                    // still want to update `elemsToBlockFromMousedown`.
                    if (needsMousedownWrapper) {
                        interceptHtmlMousedownEvent(elem)
                    }
                })
            }

            // Loop with delay
            iterTimeMs = Date.now() - start
            if (!maybeExitLoop(iterTimeMs, hoverElems)) {
                runLoop(iterTimeMs)
            }
        }, UPDATE_DELAY_MS - lastIterTimeMs)
    }


    let main = (hostname, gracePeriodS) => {
        // Block all clicks right after page load. Doesn't block other handlers attached to document, but we can live with that.
        document.addEventListener('click', blockAllClicksHandler, true)
        document.addEventListener('mousedown', blockAllClicksHandler, true)
        document.addEventListener('mouseup', blockAllClicksHandler, true)
        document.addEventListener('mouseup', () => setTimeout(() => elemsToBlockFromMousedown = new Set()), true)
        document.addEventListener('mousemove', updateMousePosHandler, true)

        if (gracePeriodS) {
            let gracePeriodMs = gracePeriodS * 1000
            MOUSE_STATIONARY_MS = gracePeriodMs
            GRACE_PERIOD_CYCLES = gracePeriodMs / UPDATE_DELAY_MS
        }

        runLoop(0)
    }


    let handleMessage = (request, sender, sendResponse) => {
        switch (request.msg) {
            case 'blockForHostname':
                main(request.hostname, request.gracePeriodS)
                break
            case 'pauseOnPage':
                pauseOnPage = true
                break
            case 'unpauseOnPage':
                pauseOnPage = false
                break
            case 'whitelist':
                pauseOnPage = true
                break
        }
    }


    chrome.runtime.onMessage.addListener(handleMessage)
    window.onload = () => {
        loading = false
        feedbackElem = document.createElement('div')
        feedbackElem.id = 'not-so-fast__feedback'
        document.body.appendChild(feedbackElem)
    }
})();
