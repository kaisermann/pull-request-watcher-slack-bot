require('dotenv/config');

const cron = require('node-cron');
const DB = require('./api/db.js');

const Slack = require('./api/slack.js');
const Logger = require('./api/logger.js');
const PR = require('./pr.js');

const check_prs = require('./tasks/check_prs.js');
const check_forgotten_prs = require('./tasks/check_forgotten_prs.js');
const check_users = require('./tasks/check_users.js');
const update_pr = require('./tasks/update_pr_message.js');

check_prs();
cron.schedule('* * * * *', check_prs, {
  scheduled: true,
  timezone: 'America/Sao_Paulo',
});

// check_forgotten_prs();
cron.schedule('0 14 * * 1-5', check_forgotten_prs, {
  scheduled: true,
  timezone: 'America/Sao_Paulo',
});


// check_users();

Slack.on_pr_message(
  pr_meta => {
    const { slug, channel } = pr_meta;

    if (DB.has_pr(channel, slug)) {
      return Logger.log(`${slug} is already being watched`);
    }
    Logger.log(`Watching ${slug}`);

    const pr = PR.create(pr_meta);

    DB.add_pr(pr);
    update_pr(pr);
  },
  ({ channel, deleted_ts }) => {
    DB.remove_pr_by_timestamp(channel, deleted_ts);
  },
);
