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

console.info('Background!');
