const fetch = require("node-fetch");
const git = require("isomorphic-git");
const fs = require("fs");
git.plugins.set("fs", fs);

module.exports = async function(context, payload) {
        context.log("JavaScript ServiceBus queue trigger function processed message:", payload);
        const pushedBy = payload && payload.resource && payload.resource.pushedBy && payload.resource.pushedBy.displayName;
        try {
            await git.clone({
                dir: "./appcenter",
                url: process.env.AZURE_DEVOPS_REPO,
                username: process.env.AZURE_DEVOPS_USERNAME,
                password: process.env.AZURE_DEVOPS_TOKEN,
                noGitSuffix: true,
                depth: 1,
                noCheckout: true,
                noTags: true,
                singleBranch: true
            });
        } catch (error) {
            context.log.error(error);
        }
        try {
            await git.fetch({
                dir: "./appcenter",
                url: process.env.AZURE_DEVOPS_REPO,
                ref: process.env.AZURE_DEVOPS_TAG,
                username: process.env.AZURE_DEVOPS_USERNAME,
                password: process.env.AZURE_DEVOPS_TOKEN,
                noGitSuffix: true,
                depth: 1,
                singleBranch: true
            });
            context.log("Tags were detected after this person pushed:", pushedBy);
            const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                body: JSON.stringify({
                    text: `Tags were detected after this person pushed: ${pushedBy}`
                })
            });
            const slackResponseText = await slackResponse.text();
            context.log(slackResponseText);
        } catch (error) {
            if (error.code === "ResolveRefError") {
                context.log("The remote is tag-free!");
                const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        text: "The remote is tag-free!"
                    })
                });
                const slackResponseText = await slackResponse.text();
                context.log(slackResponseText);
            } else {
                context.log.error(error);
            }
        }
        // (Attempting to) fetch a specific tag is way faster than fetching all tags and then counting them.
        // But if issues arise with the specific-tag approach, consider an alternative like the code below.
        // Make sure you remove 'noTags: true' (and possibly other options) from the 'git.clone' call.
        // 
        // const tags = await git.listTags({ dir: "./appcenter" });
        // context.log("Number of tags detected:", (tags || []).length);
        // if (tags && tags.length > 0) {
        //     context.log("Tags were detected after this person pushed:", pushedBy);
        // }
};