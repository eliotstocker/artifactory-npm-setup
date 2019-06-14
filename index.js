'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const cli = require('command-line-args');
const usage = require('command-line-usage');
const axios = require('axios');
const {app, BrowserWindow} = require('electron');

const options = require('./options');
const version = require('./package').version;

const homedir = require('os').homedir();

const loginPath = '/artifactory/webapp/#/login';
const authEndpoint = '/artifactory/api/npm/auth/';
const authEndpointScoped = '/artifactory/api/npm/npm/auth/';
const userEndpoint = '/artifactory/ui/auth/current';
const apiKeyEndpoint = '/artifactory/ui/userApiKey';

function printHelpandExit(code, error) {
    const sections = [
        {
            header: `Artifactory NPM Setup (${version})`,
            content: 'setting up your npmrc in a sane manor'
        },
        {
            header: 'Options',
            optionList: options
        }
    ];

    if (error) {
        sections.splice(1, 0, {
            header: 'Error',
            content: error
        })
    }
    console.log(usage(sections));
    process.exit(code);
}

let opts;

try {
    opts = cli(options);
    if (!opts.server) {
        printHelpandExit(1,'the \'server\' argument is required');
    }

    const url = new URL(opts.server);
    opts.base = `${url.protocol}//${url.host}`;
    opts.host = url.host;

    opts['keep-existing'] = !opts['no-keep-existing'];

    opts.path = opts['npmrc-path'] ? path.resolve(opts['npmrc-path']) : path.resolve(homedir, '.npmrc');
} catch (e) {
    printHelpandExit(1, e.message);
}

if (opts.help) {
    printHelpandExit(0);
}

if (opts.scopes && opts.scopes.filter(s => !s.startsWith('@')).length) {
    printHelpandExit(1,'scopes must start with \'@\'');
}

if (opts['api-key']) {
    if(!opts['api-username']) {
        printHelpandExit(1,'\'api-username\' must be provided when using api-key authentication...');
    }
    console.log('skipping login api key provided');
    app.on('ready', SkipLogin);
} else {
    console.log('Getting login pane...');
    app.on('ready', showLoginWindow);
}

function SkipLogin() {
    getAuthWithAPIKey({
        username: opts['api-username'],
        apiKey: opts['api-key']
    }).catch(e =>{
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
                    .then(getAPICreds)
                    .then(getAuthWithAPIKey)
                    .catch(e =>{
                        console.error(e);
                        process.exit(1);
                    });
            }
        })
    });
    win.loadURL(`${opts.base}${loginPath}`);
}

function getAuthWithAPIKey(creds) {
    const {username, apiKey} = creds;

    return CallAuthEndpoint({
        username: username,
        password: apiKey
    })
}

function getAPICreds(cookies) {
    const cookieString = cookies.reduce((acc, cookie) => {
        return `${acc}${cookie.name}=${cookie.value}; `;
    }, '');

    const headers = {
        Cookie: cookieString
    };

    const userInfo = axios.get(`${opts.base}${userEndpoint}`, {headers});
    const apiKeyInfo = axios.get(`${opts.base}${apiKeyEndpoint}`, {headers});

    return Promise.all([
        userInfo,
        apiKeyInfo
    ]).then(([user, apiKey]) => {
        if (!apiKey.data.apiKey) {
            return generateAPIKey(headers, user.data.name);
        }
        return {
            username: user.data.name,
            apiKey: apiKey.data.apiKey
        };
    });
}

function generateAPIKey(headers, username) {
    console.log(`generating API key for user: ${username}`);

    const allHeaders = Object.assign({
        'X-Requested-With': 'artUI'
    }, headers);

    return axios.post(`${opts.base}${apiKeyEndpoint}?user=${username}`, {username}, {
        headers: allHeaders,
        auth: {
            username: 'username',
            password: 'null'
        }
    })
        .then(resp => resp.data)
        .then(data => ({
            username,
            apiKey: data.apiKey
        }));
}

function CallAuthEndpoint(auth) {
    if(opts.scopes) {
        return axios.get(`${opts.base}${authEndpointScoped}scope`, {
            auth
        })
            .then(resp => resp.data)
            .then(writeNPMRC);
    }
    return axios.get(`${opts.base}${authEndpoint}`, {
        headers
    })
        .then(resp => resp.data)
        .then(writeNPMRC);
}

function writeNPMRC(data) {
    let npmrc = data;
    if (opts.scopes) {
        const lines = npmrc.split('\n');
        const scopeLine = lines.find(line => line.startsWith('@scope'));
        const scopeLines = opts.scopes.map(scope => scopeLine.replace('@scope', scope));
        const scopeIndex = lines.indexOf(scopeLine);

        lines.splice(scopeIndex, 1, ...scopeLines);

        npmrc = lines.join('\n');
    }
    return checkifNpmrcExists()
        .then(exists => {
            if (exists) {
                return backupExistingNpmrc()
                    .then(commentOutExistingScopes);
            }
            return Promise.resolve('');
        })
        .then((existing) => fsp.writeFile(opts.path, [existing, npmrc].join('\n'), {
            encoding: 'ascii'
        }))
        .then(() =>{
            console.log('written new npmrc file');
            app.exit(0);
        })
}

function commentOutExistingScopes() {
    if(opts['keep-existing']) {
        return fsp.readFile(opts.path, 'utf-8')
            .then(data => {
                if (opts.scopes) {
                    const lines = data.split('\n');
                    const updated = lines.map(line => {
                        const ls = line.split(':')[0];
                        if (opts.scopes.includes(ls)) {
                            return `#Commented out by artifactory npm setup: ${line}`
                        }
                        return line;
                    });
                    return updated.join('\n');
                }

                return data;
            });
    }
    return '';
}

function backupExistingNpmrc() {
    const backupName = `${opts.path}-${new Date().getTime()}`;
    console.log(`backing up current .npmrc as: ${backupName}`);
    return fsp.copyFile(opts.path, backupName);
}

function checkifNpmrcExists() {
    return fsp.access(opts.path, fs.F_OK).then(() => {
        return true;
    }).catch(() => {
        return false;
    });
}
