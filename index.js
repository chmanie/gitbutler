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
var GITHUB_STATUS_CHANNEL = config.settings.GITHUB_STATUS_CHANNEL;
var GITHUB_PARSE_REGEX = '(([^#\\s\\(,]+)\/)?([^#\\s\\(,]+?)?#([0-9]+)';

var channels = config.channels;

var bot = new Bot(settings);
var parrots = 0;
var lastparrot = new Date();
var githubDown = false;

bot.on('message', function (data) {
  if (data.type === 'reaction_added' && data.reaction === 'partyparrot') {
    parrots++;
    var now = new Date();
    var difference = now.valueOf() - lastparrot.valueOf();
    if (difference > (12 * 60 * 60 * 1000)) {
      var parrotMsg = 'It was about time! Last :partyparrot: was ' + Math.ceil(difference / (60 * 60 * 1000)) + ' hour(s) ago!';
      bot.postMessageToChannel(channels[data.channel], parrotMsg, {
        icon_emoji: BOT_AVATAR
      });
    }
    lastparrot = new Date();
  }
  if (data.type === 'message') {
    var say = data.text && data.text.match(/^chewie\ssay\s(.+?)\s(.+)$/);
    if (say) {
      var channel = say[1];
      var words = say[2];
      return bot.postMessageToChannel(channel, words, {
        icon_emoji: BOT_AVATAR
      });
    }
    if (data.text && data.text.match(/(chewie|Chewie)/)) {
      return bot.postMessageToChannel(channels[data.channel], 'Gnaaaaarrrrl!', {
        icon_emoji: BOT_AVATAR
      });
    }
    if (data.text && data.text.match(/whenparrot/)) {
      var now = new Date();
      var difference = now.valueOf() - lastparrot.valueOf();
      var parrotMsg = 'Last :partyparrot: was ' + Math.ceil(difference / (60 * 60 * 1000)) + ' hour(s) ago! I am glad you asked';
      return bot.postMessageToChannel(channels[data.channel], parrotMsg, {
        icon_emoji: BOT_AVATAR
      });
    }
    if (data.username === config.credentials.SLACK_BOT_NAME) return;
    if (Object.keys(channels).indexOf(data.channel) === -1) return;
    var match = data.text && data.text.match(new RegExp(GITHUB_PARSE_REGEX, 'g'));
    if (!match) return;
    if (match.length === 1) {
      var parsed = parseMatch(match[0]);
      return getGithubData(parsed.user, parsed.repo, parsed.no, function (err, res) {
        if (err) {
          return console.log(err);
        }
        if (!res || !res.title) {
          return;
        }
        var msg = '#' + parsed.no + ': *' + res.title + '* - ' + 'https://github.com/' + (parsed.user || DEFAULT_ACCOUNT) + '/' + (parsed.repo || DEFAULT_REPO)  + '/issues/' + parsed.no;
        bot.postMessageToChannel(channels[data.channel], msg, {
          icon_emoji: BOT_AVATAR
        });
      });
    }

    var args = match.map(parseMatch);

    runAsync.map(args, function (ghArgs, callback) {
      getGithubData(ghArgs.user, ghArgs.repo, ghArgs.no, function (err, res) {
        callback(err, {
          title: res.title,
          user: ghArgs.user,
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
          return '#' + res.no + ': *' + res.title + '* - ' + 'https://github.com/' + (res.user || DEFAULT_ACCOUNT) + '/' + (res.repo || DEFAULT_REPO)  + '/issues/' + res.no;
        }).join('\n');
      bot.postMessageToChannel(channels[data.channel], msg, {
        icon_emoji: BOT_AVATAR
      });
    });
  }
});

setInterval(function getGithubStatus () {
  request.get({
    url: 'https://status.github.com/api/status.json',
    json: true,
  }, function (err, resp, body) {
    if (body.status === 'good') {
      if (githubDown) {
        bot.postMessageToChannel(GITHUB_STATUS_CHANNEL, ':rocket: GitHub is back to normal! :heart:', {
          icon_emoji: BOT_AVATAR
        });
        githubDown = false;
      }
      return;
    }
    if (githubDown) return;
    bot.postMessageToChannel(GITHUB_STATUS_CHANNEL, ':scream: Oi! GitHub doesn\'t seem to be working properly. More info here: https://status.github.com :scream:', {
      icon_emoji: BOT_AVATAR
    });
    githubDown = true;
  });
}, 5 * 60 * 1000);

function parseMatch(str) {
  var regex = new RegExp(GITHUB_PARSE_REGEX);
  var match = str.match(regex);
  if (match) {
    return {
      user: match[2],
      repo: match[3],
      no: match[4]
    }
  }
}

function getGithubData(user, repo, no, callback) {
  return request.get({
    url: 'https://api.github.com/repos/' + (user || DEFAULT_ACCOUNT) + '/' + (repo || DEFAULT_REPO) + '/issues/' + no,
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
