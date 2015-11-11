var Bot = require('slackbots');
var request = require('request');

// create a bot
var settings = {
    token: '%%%',
    name: '%%%'
};

var DEFAULT_REPO = '%%%';

var channels = {};

var bot = new Bot(settings);

bot.on('message', function (data) {
  if (data.type === 'message') {
    if (data.username === '%%%') return;
    if (Object.keys(channels).indexOf(data.channel) === -1) return;
    var match = data.text.match(/([^#\s]+?)?#([0-9])+/g);
    if (!match) return;
    if (match.length === 1) {
      var str = match[0].split('#');
      var repo = str[0] || DEFAULT_REPO;
      var no = str[1];
      return request.get({
        url: 'https://api.github.com/repos/%%%/' + repo + '/issues/' + no,
        auth: {
          user: '%%%',
          pass: '%%%'
        },
        headers: {
          'user-agent': 'request'
        },
        json: true
      }, function (err, resp, body) {
        if (err || !body.title) return;
        var msg = body.title + ' - ' + 'https://github.com/%%%/' + repo + '/issues/' + no;
        bot.postMessageToChannel(channels[data.channel], msg);
      });
    }
    var msg = match.map(function (str) {
      str = str.split('#');
      var repo = str[0] || DEFAULT_REPO;
      var no = str[1];
      return 'https://github.com/%%%/' + repo + '/issues/' + no;
    }).join(' - ');
    bot.postMessageToChannel(channels[data.channel], msg);
  }
});