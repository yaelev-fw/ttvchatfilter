// ==UserScript==
// @name TTVChatFilter
// @namespace localhost
// @version 0.6
// @description Filter/search TTV chat messages, supports text and usernames.
// @author me
// @match https://www.twitch.tv/*
// @grant none
// @updateURL https://github.com/yaelev-fw/ttvchatfilter/raw/main/ttvchatfilter.user.js
// @downloadURL https://github.com/yaelev-fw/ttvchatfilter/raw/main/ttvchatfilter.user.js
// ==/UserScript==


// TODO:
// • This is working for ffz chats, other variants untested.
// • BTTV emotes, do they follow the FFZ standard?


var previousChannel;
var searchField;
var searchFieldParent;
var messageList;
var startLoop;
var messageObserver;
var searchTerm = "";


// If we don't have a head we're in big trouble
var head = document.getElementsByTagName("head");
if (head.length > 0)
{
    messageObserver = new MutationObserver(function (mutationsList, observer)
    {
        var title = document.getElementsByTagName("head")[0].getElementsByTagName("title")[0].innerText;

        // Reset at new page
        if (title.indexOf(" - Twitch") > 0 && previousChannel != title)
        {
            previousChannel = title;
            if (searchField != undefined)
            {
                searchField.remove();
                searchField = undefined;
            }
            if (searchFieldParent != undefined)
            {
                searchFieldParent.remove();
                searchFieldParent = undefined;
            }
            if (messageList != undefined)
            {
                messageList = undefined;
            }
            if (messageObserver != undefined)
            {
                messageObserver = undefined;
            }

            searchTerm = "";
            startLoop  = setInterval(run, 1000/60);
        }
    });
    messageObserver.observe(head[0], {attributes: true, childList: true, subtree: true});
}


function run()
{
    // Hook up message observer
    if (messageList == undefined)
    {
        var msgList = document.getElementsByClassName("chat-scrollable-area__message-container tw-flex-grow-1 tw-pd-b-1");
        if (msgList.length > 0)
        {
            messageList = msgList[0];

            var conf = {attributes: true, childList: true, subtree: false};
            messageObserver = new MutationObserver(function (mutationsList, observer)
            {
                run();
            });
            messageObserver.observe(messageList, conf);
        }
    }

    // Create the search field
    if (searchField == undefined && searchFieldParent == undefined)
    {
        var rightButtonsRow = document.getElementsByClassName("chat-input__buttons-container tw-flex tw-justify-content-between tw-mg-t-1");
        if (rightButtonsRow.length > 0)
        {
            rightButtonsRow = rightButtonsRow[0].getElementsByClassName("tw-align-content-center tw-align-items-center tw-flex tw-flex-row");
            if (rightButtonsRow.length > 0)
            {
                searchFieldParent           = document.createElement('div');
                searchFieldParent.innerHTML = `<input class="searchInput" type="text" placeholder="Search..">`;

                searchFieldParent.style.width      = "100%";
                searchFieldParent.style.marginLeft = "10px";

                rightButtonsRow[0].before(searchFieldParent);

                searchField                       = searchFieldParent.getElementsByTagName("input")[0];
                searchField.style.backgroundColor = "var(--color-background-input)";
                searchField.style.paddingTop      = "0.5rem";
                searchField.style.paddingBottom   = "0.5rem";
                searchField.style.paddingLeft     = "0.5rem";
                searchField.style.border          = "var(--border-width-input) solid var(--color-border-input)";
                searchField.style.borderColor     = "transparent";
                searchField.style.borderRadius    = "var(--border-radius-medium)";
                searchField.style.color           = "var(--color-text-input)";
                searchField.style.alignContent    = "center";
                searchField.style.width           = "100%";
                searchField.style.backgroundClip  = "padding-box";

                searchField.onmouseenter = function ()
                {
                    if (searchField != document.activeElement)
                        searchField.style.borderColor = "var(--color-border-input-hover)";
                }
                searchField.onmouseleave = function ()
                {
                    if (searchField != document.activeElement)
                        searchField.style.borderColor = "transparent";
                }
                searchField.onfocus = function ()
                {
                    searchField.style.border          = "var(--border-width-input) solid var(--color-border-input-focus)";
                    searchField.style.backgroundColor = "var(--color-background-input-focus)";
                    searchField.style.outline         =
                    {
                        outlineColor: "currentcolor",
                        outlineStyle: "none",
                        outlineWidth: "0px"
                    }
                }
                searchField.onblur = function ()
                {
                    searchField.style.border          = "var(--border-width-input) solid var(--color-border-input)";
                    searchField.style.borderColor     = "transparent";
                    searchField.style.backgroundColor = "var(--color-background-input)";
                }

                searchField.oninput = function (){searchTerm = searchField.value.trim(); run()};
            }
        }
    }

    // We have implemented what we need, now stop the horrible loop
    if (messageList != undefined && searchField != undefined)
    {
        clearInterval(startLoop);
    }

    // Filter messages
    var messages = document.getElementsByClassName("chat-scrollable-area__message-container tw-flex-grow-1 tw-pd-b-1")[0].children;//document.getElementsByClassName("chat-line__message");
    for (var i=0; i<messages.length; i++)
    {
        handleFFZMessage(messages[i]);
    }
}


function handleFFZMessage(messageElement)
{
    var container = messageElement.getElementsByClassName("chat-line__message-container");
    var message;
    if (container.length > 0)
        message = container[0];
    else
        message = messageElement;

    if ((searchTerm == "" || searchTerm == undefined) && messageElement.style.display == "none")
    {
        messageElement.style.display = "block";
    }
    else
    {
        var user = message.getElementsByClassName("chat-author__display-name");
        if (user.length > 0)
        {
            user = user[0].innerText;

            var elements = message.getElementsByClassName("message");
            if (elements.length > 0)
            {
                var msg = "";
                for (var i=0; i<elements[0].children.length; i++)
                {
                    var element = elements[0].children[i];
                    if (element.getAttribute("class") == "text-fragment")
                        msg += element.innerText;
                    else if (element.getAttribute("class") == "ffz--inline")
                        msg += element.children[0].getAttribute("alt");

                    if (i < elements.length -1)
                        msg += " ";
                }

                if (user.toLowerCase().indexOf(searchTerm.toLowerCase()) < 0 && msg.toLowerCase().indexOf(searchTerm.toLowerCase()) < 0)
                {
                    messageElement.style.display = "none";
                }
                else if (messageElement.style.display == "none")
                {
                    messageElement.style.display = "block";
                }
            }
        }
        else
        {
            if (searchTerm == "")
                messageElement.style.display = "block";
            else
                messageElement.style.display = "none";
        }
    }
}
