'use strict';

const functions = require('./lib/functionality');

let opts = functions.getOptions();
functions.validateOptions();

if(!opts['api-username']) {
    functions.printHelpandExit(1,'\'api-username\' must be provided when using api-key authentication...');
}

functions.getAuthWithAPIKey({
    username: opts['api-username'],
    apiKey: opts['api-key']
})
    .then(functions.writeNPMRC)
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
