const fetch = require("node-fetch");
const rimraf = require("rimraf");
const git = require("isomorphic-git");
const fs = require("fs");
git.plugins.set("fs", fs);

module.exports = async function(context, payload) {
        context.log("JavaScript ServiceBus queue trigger function processed message:", payload);
        const pushedBy = payload && payload.resource && payload.resource.pushedBy && payload.resource.pushedBy.displayName;
        // Clean-up previous clones (if any)
        try {
            rimraf.sync("./appcenter");
        } catch (error) {
            context.log.error(error);
        }
        // Clone the repo (fetches tags)
        try {
            await git.clone({
                dir: "./appcenter",
                url: process.env.AZURE_DEVOPS_REPO,
                username: process.env.AZURE_DEVOPS_USERNAME,
                password: process.env.AZURE_DEVOPS_TOKEN,
                noGitSuffix: true,
                depth: 1,
                noCheckout: true
            });
        } catch (error) {
            context.log.error(error);
        }
        // Count the tags
        const tags = await git.listTags({ dir: "./appcenter" });
        context.log("Number of tags detected:", (tags || []).length);
        if (!tags || tags.length === 0) {
            // No tags!
            context.log("The remote is tag-free! Pushed by:", pushedBy);
            return;
        }
        // Oh no, tags!
        context.log("Tags were detected after this person pushed:", pushedBy);
        if (process.env.SLACK_WEBHOOK_URL) {
            try {
                const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        text: `Tags were detected after this person pushed: ${pushedBy}`
                    })
                });
                const slackResponseText = await slackResponse.text();
                context.log(slackResponseText);
            } catch (error) {
                context.log.error(error);
            }
        }
};