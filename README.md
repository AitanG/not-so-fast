# Not So Fast

## Overview

Not So Fast is a Chrome extension that prevents accidental clicks due to elements moving around on the page.

[Chrome Web Store extension](https://chrome.google.com/webstore/detail/not-so-fast/hiegkehekilfjpcolajfmlcjjbohloei/related)

## Problem

Have you ever tried to click on something only to have some other button or link take its place right as you click on it? That's the problem Not So Fast solves.

Not So Fast detects when elements have moved near your cursor and sets up a short "grace period" where any accidental clicks are ignored. This can prevent things like pressing the wrong button, losing your place on the page, or opening dangerous links. The added security also makes for a more pleasant browsing experience, since you don't have to worry as much about accidentally clicking the wrong thing.

## Implementation

The extension works by constantly tracking which elements are under the cursor. The cursor's coordinates are updated with `onmousemove`, and each page has a loop that runs in the background that finds all HTML elements at those coordinates. If this set of elements is different than it was a number of milliseconds ago (this number is called the grace period), then all click events are disabled. This is achieved by wrapping the original event listeners with logic that calls `preventDefault`.

The real implementation is slightly more complicated than this, but this should give a general idea. The overall result is supposed to be a high-precision blocking of accidental mouse events with minimal performance overhead. See `content.js` for more implementation details.

The user has the ability to adjust the length of the grace period in the extension's options. They can also pause the extension on a page and/or permanently whitelist domains.

Screenshot of whitelisting interface:

<img src="https://github.com/AitanG/not-so-fast/blob/master/popup.png?raw=true" alt="Screenshot of whitelisting interface" width="300"/>

## Progress

The code I have works! Anyone can install the extension on a Chromium browser like Google Chrome or Microsoft Edge. However, there are a few major things I still need to do:
* Optimizing for real-world usage
* Lots of testing, and potential debugging of edge cases
* Paying some more attention to UI
* Getting the extension ready for other browsers (i.e., Edge, Firefox, Safari)
