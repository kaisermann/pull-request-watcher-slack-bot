const { RTMClient } = require('@slack/rtm-api');
const { WebClient, retryPolicies } = require('@slack/web-api');

const TOKEN = process.env.SLACK_TOKEN;
const RTM = new RTMClient(TOKEN);

const PRIVATE_TEST_CHANNEL = 'GKSCG1GRX';

const PR_REGEX = /github\.com\/([\w-]*)?\/([\w-]*?)\/pull\/(\d+)/i;

exports.WebClient = new WebClient(TOKEN, {
  retryConfig: retryPolicies.rapidRetryPolicy,
});

exports.onPRMessage = async onMessage => {
  RTM.on('message', e => {
    try {
      const { thread_ts, subtype, text } = e;
      // we just want channel messages
      if (
        thread_ts != null ||
        subtype != null ||
        (process.env.NODE_ENV === 'production' &&
          e.channel === PRIVATE_TEST_CHANNEL)
      ) {
        return;
      }

      const match = text.match(PR_REGEX);

      if (match) {
        const [, user, repo, prID] = match;
        const slug = `${user}/${repo}/${prID}`;
        onMessage({
          user,
          repo,
          prID,
          slug,
          timestamp: e.event_ts,
          channel: e.channel,
        });
      }
    } catch (error) {
      console.log(error);
    }
  });

  await RTM.start();
};
