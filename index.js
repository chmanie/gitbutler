var Bot = require('slackbots');
var runAsync = require('async');
var request = require('request');

var config = require('./slackbotrc.json');

// create a bot
var settings = {
    token: config.credentials.SLACK_TOKEN,
    name: config.credentials.SLACK_BOT_NAME
};

var DEFAULT_REPO = config.settings.DEFAULT_REPO;
var DEFAULT_ACCOUNT = config.settings.DEFAULT_ACCOUNT;
var BOT_AVATAR = config.settings.BOT_AVATAR;

var channels = config.channels;

var bot = new Bot(settings);

bot.on('message', function (data) {
  if (data.type === 'message') {
    if (data.username === config.credentials.SLACK_BOT_NAME) return;
    if (Object.keys(channels).indexOf(data.channel) === -1) return;
    var match = data.text && data.text.match(/([^#\s]+?)?#([0-9])+/g);
    if (!match) return;
    if (match.length === 1) {
      var str = match[0].split('#');
      var repo = str[0] || DEFAULT_REPO;
      var no = str[1];
      return getGithubData(repo, no, function (err, res) {
        if (err) {
          return console.log(err);
        }
        if (!res || !res.title) {
          return;
        }
        var msg = '#' + no + ': *' + res.title + '* - ' + 'https://github.com/' + DEFAULT_ACCOUNT + '/' + repo + '/issues/' + no;
        bot.postMessageToChannel(channels[data.channel], msg, {
          icon_emoji: BOT_AVATAR
        });
      });
    }

    var args = match.map(function (str) {
      str = str.split('#');
      return {
        repo: str[0] || DEFAULT_REPO,
        no: str[1]
      }
    });

    runAsync.map(args, function (ghArgs, callback) {
      getGithubData(ghArgs.repo, ghArgs.no, function (err, res) {
        callback(err, {
          title: res.title,
          repo: ghArgs.repo,
          no: ghArgs.no
        });
      });
    }, function (err, resArray) {
      if (err) {
        return console.log(err);
      }
      var msg = resArray
        .filter(function (res, idx, self) {
          return self.findIndex(oneRes => oneRes.no === res.no) === idx;
        })
        .map(function(res) {
          return '#' + res.no + ': *' + res.title + '* - ' + 'https://github.com/' + DEFAULT_ACCOUNT + '/' + res.repo + '/issues/' + res.no;
        }).join('\n');
      bot.postMessageToChannel(channels[data.channel], msg, {
        icon_emoji: BOT_AVATAR
      });
    });
  }
});

function getGithubData(repo, no, callback) {
  return request.get({
    url: 'https://api.github.com/repos/' + DEFAULT_ACCOUNT + '/' + repo + '/issues/' + no,
    auth: {
      user: config.credentials.GITHUB_USERNAME,
      pass: config.credentials.GITHUB_TOKEN
    },
    headers: {
      'user-agent': 'request'
    },
    json: true
  }, function (err, resp, body) {
    callback(null, {
      title: body.title
    });
  });
}
