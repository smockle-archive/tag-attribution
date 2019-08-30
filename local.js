const fn = require("./ClaysAzureDevOpsTestFunction/index");
const context = {};
context.log = console.log.bind(console);
context.log.error = console.error.bind(console);
const payload = {
  resource: {
    pushedBy: {
      displayName: "Clay Miller"
    }
  }
}
fn(context, payload)