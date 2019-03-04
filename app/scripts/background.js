var commands = {};
var metadata = {};
var lastUpdated = {};

chrome.browserAction.setPopup({ popup: "popup.html" });
chrome.runtime.onInstalled.addListener(function(info) {
    // if(info.details == "update" || info.details == "install") {
    // chrome.browserAction.setBadgeText({text:"1"});
    // }
  })

chrome.browserAction.onClicked.addListener(function() { chrome.browserAction.setPopup({ popup: "popup.html" }) })

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  var orgKey = request.key != null ? request.key.split('!')[0] : request.key

  if (request.action == 'Get API Session ID') {
    if (request.key != null) {
    request.sid = request.uid = request.domain = ""
    chrome.cookies.getAll({}, function(all) {
        all.forEach(function(c) {
          if(c.domain.includes("salesforce.com") && c.value.includes(request.key)) {
            if(c.name == 'sid') {
              request.sid = c.value
              request.domain = c.domain
            }
            else if(c.name == 'disco')
              request.uid = c.value.match(/005[\w\d]+/)[0]
          }
        })
        if(request.sid != "" || request.uid != "")
          sendResponse({sessionId: request.sid, userId: request.uid, classicURL: request.domain})
        else
          sendResponse({error: "No session data found for " + request.key})
        return request
      })
    } else { sendResponse({error: "Must include orgId"}) }
  }

  else if (request.action == 'Store Commands') {
    Object.keys(lastUpdated).forEach(function(key) {
      if(key != request.key && key.split('!')[0] == orgKey) {
        delete commands[key]
        delete lastUpdated[key]
      }
    })
    commands[request.key] = request.payload
    lastUpdated[request.key] = new Date()
    sendResponse({lastUpdated: lastUpdated[request.key]})
  }

  else if (request.action == 'Clear Commands') {
    delete commands[request.key]
    delete lastUpdated[request.key]
    sendResponse({})
  }

  else if (request.action == 'Get Commands') {
    if (commands[request.key] != null)
      sendResponse(commands[request.key])
    else
      sendResponse(null)
  }

  else if (request.action == 'Toggle Detailed Mode') {
    var settings = localStorage.getItem('sfnav_settings')
    if (settings != null) {
      delete commands[request.key]
      delete lastUpdated[request.key]
      var sett = JSON.parse(settings)
      sett['detailedMode'] = !sett['detailedMode']
      localStorage.setItem('sfnav_settings', JSON.stringify(sett))
    }
    sendResponse(1)
  }
  else if (request.action == 'Get Settings') {
    var settings = localStorage.getItem('sfnav_settings')
    if (settings != null) { sendResponse(JSON.parse(settings))
    } else {
      localStorage.setItem('sfnav_settings', JSON.stringify({'shortcut': 'ctrl+shift+space'}))
      sendResponse({'shortcut': 'ctrl+shift+space'})
    }
  }

  else if (request.action == 'Set Settings') {
    var settings = localStorage.getItem('sfnav_settings');
    if (settings != null) {
      var sett = JSON.parse(settings);
      let payloadKeys = Object.keys(request.payload)
      for (var i = 0; i < payloadKeys.length; i++) {
        key = payloadKeys[i]
        sett[key] = request.payload[key]
      }
      localStorage.setItem('sfnav_settings', JSON.stringify(sett))
    }
    commands = lastUpdated = {}
    sendResponse({});
  }

  else if (request.action == 'Store Metadata') {
    Object.keys(metadata).forEach(function(key) {
      if (key != request.key && key.split('!')[0] == orgKey)
        delete metadata[key];
    });
    metadata[request.key] = metadata[orgKey] = request.payload;
    sendResponse({});
  }

  else if (request.action == 'Get Metadata') {
    if (metadata[request.key] != null)
      sendResponse(metadata[request.key]);
    else if (metadata[orgKey] != null)
      sendResponse(metadata[orgKey]);
    else
      sendResponse(null);
  }
  return true
})