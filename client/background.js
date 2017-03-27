'use strict';

chrome.runtime.onInstalled.addListener(function () {
    //noinspection JSUnresolvedVariable
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        // With a new rule ...
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        chrome.declarativeContent.onPageChanged.addRules([
            {
                // That fires when a page's URL contains a 'g' ...
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {urlContains: 'http://capitalcity.oldbk.com/battle.php'}
                    })
                ],
                // And shows the extension's page action.
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });
});

chrome.cookies.onChanged.addListener(function (event) {
    if (event.removed && event.cookie.domain === '.oldbk.com' && event.cookie.name === 'PHPSESSID') {
        E.cache.online = false;
    }
});

chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
    if (!request || request.action !== 'ping' && !E.cache.online) {
        return;
    }

    var action = E.actions[request.action];
    if (typeof action === 'function') {
        action(request.options, sendResponse, sender);
    }

    return true;
});

E.startScheduler();

console.info('Background!!!!!!!!!!!!!!!!!!!!!!');
