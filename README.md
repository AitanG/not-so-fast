# Not So Fast

## Overview

Not So Fast is a Chrome extension under development that prevents accidental clicks due to elements moving around on the page. I set up this repo to facilitate development, and I'll ultimately use it to open-source the extension once it makes it to the web store.

## Problem

Have you ever tried to click on something only to have some other button or link take its place right as you click on it? It's obvious to everyone that you meant to click on the first thing--that is, everyone but your browser. That's the problem Not So Fast solves. With Not So Fast, you can click without fear.

## Implementation

The extension works by constantly tracking which elements are under the mouse. The mouse's coordinates are updated with `onmousemove`, and a loop runs in the background of each page that finds all HTML elements at those coordinates. If this set of elements is different than it was a number of milliseconds ago (this number is called the grace period), then all click events are blocked, which is achieved by wrapping the original event listeners.

The real implementation is slightly more complicated than this, but this should give a general idea. The overall result is supposed to be a high-precision blocking of accidental mouse events with minimal impact on memory and CPU. See `content-script.js` for more implementation details.

The user has the ability to adjust the length of the grace period in the extension's options. They can also pause the extension on a page and "blacklist" domains.

## Progress

The code I have works! Anyone can download this repo and try it out on Chrome in developer mode (see instructions [here](https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/)). However, there are a few major things I still need to do:
* Optimizing for real-world usage
* Lots of testing, and potential debugging of edge cases
* Paying some more attention to UI
* Productionizing
* Getting approved on the Chrome Web Store
* Getting the extension ready for other browsers (i.e., Edge, Firefox, Safari)
