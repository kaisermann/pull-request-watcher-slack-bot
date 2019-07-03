require('dotenv').config();

const { github } = require('./github.js');
const { WebClient } = require('./slack.js');

const MINUTES_TO_NEED_ATTENTION = 60;
const QUICK_ADDITION_LIMIT = 80;

exports.addReaction = async (name, meta) => {
  if (meta.reactions.includes(name)) {
    return;
  }

  console.log(`Adding reaction: ${name}`);

  meta.reactions.push(name);

  return WebClient.reactions.add({
    name,
    timestamp: meta.timestamp,
    channel: meta.channel,
  });
};
exports.removeReaction = async (name, meta) => {
  if (!meta.reactions.includes(name)) {
    return;
  }

  console.log(`Removing reaction: ${name}`);

  meta.reactions = meta.reactions.filter(r => r !== name);

  return WebClient.reactions.remove({
    name,
    timestamp: meta.timestamp,
    channel: meta.channel,
  });
};

exports.createPR = ({ slug, user, repo, prID, channel, timestamp }) => {
  try {
    return {
      slug,
      prID,
      user,
      repoName: repo,
      channel,
      timestamp,
      reactions: [],
    };
  } catch (error) {
    console.error(error);
  }
};

exports.checkPR = async meta => {
  const result = {};

  try {
    console.log(`Checking: ${meta.slug}`);
    const pr = await github.pulls.get({
      owner: meta.user,
      repo: meta.repoName,
      pull_number: meta.prID,
    });

    const reviews = await github.pulls.listReviews({
      owner: meta.user,
      repo: meta.repoName,
      pull_number: meta.prID,
    });

    const changesRequested = reviews.data.some(
      r => r.state === 'CHANGES_REQUESTED',
    );
    const approved = reviews.data.some(r => r.state === 'APPROVED');

    const minutesSinceMessage =
      (new Date(meta.timestamp * 1000) - new Date()) / (1000 * 60);

    console.log(`- Changes Requested: ${changesRequested}`);
    console.log(`- Approved: ${approved}`);
    console.log(`- Merged: ${pr.data.merged}`);
    console.log(`- Posted ${minutesSinceMessage} minutes ago`);
    console.log('');

    result.changesRequested = changesRequested;
    result.approved = approved;
    result.quick = pr.data.additions <= QUICK_ADDITION_LIMIT;
    result.reviewed = pr.data.review_comments > 0;
    result.merged = pr.data.merged;
    result.needsAttention = minutesSinceMessage >= MINUTES_TO_NEED_ATTENTION;
  } catch (error) {
    console.log(error);
  }

  return result;
};
