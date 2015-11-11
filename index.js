var Bot = require('slackbots');
var request = require('request');

// create a bot
var settings = {
    token: process.env.SLACK_TOKEN,
    name: process.env.SLACK_BOT_NAME
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
          user: process.env.GITHUB_USERNAME,
          pass: process.env.GITHUB_TOKEN
        },
        headers: {
          'user-agent': 'request'
        },
        json: true
      }, function (err, resp, body) {
        if (err || !body.title) return;
        var msg = '*#' + no + ':* ' + body.title + ' - ' + 'https://github.com/%%%/' + repo + '/issues/' + no;
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
