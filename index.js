'use strict';
const {app, BrowserWindow} = require('electron');
const loginPath = '/artifactory/webapp/#/login';

const functions = require('./lib/functionality');


let opts = functions.getOptions();

functions.validateOptions();

if (opts['api-key']) {
    if(!opts['api-username']) {
        functions.printHelpandExit(1,'\'api-username\' must be provided when using api-key authentication...');
    }
    console.log('skipping login api key provided');
    app.on('ready', simple);
} else {
    console.log('Getting login pane...');
    app.on('ready', showLoginWindow);
}

function simple() {
    functions.getAuthWithAPIKey
        .catch(e => {
            console.error(e);
            process.exit(1);
        });
}

function showLoginWindow() {
    const win = new BrowserWindow({width: 800, height: 800, show: false});
    win.once('ready-to-show', () => {
        win.show();
        win.webContents.addListener('did-navigate', (event, url) => {
            const u = new URL(url);
            if (u.host === opts.host && !url.endsWith(loginPath)) {
                win.hide();
                const domain = opts.base.split('//')[1];
                win.webContents.session.cookies.get({domain})
                    .then(functions.getAPICreds)
                    .then(functions.getAuthWithAPIKey)
                    .catch(e =>{
                        console.error(e);
                        process.exit(1);
                    });
            }
        })
    });
    win.loadURL(`${opts.base}${loginPath}`);
}
