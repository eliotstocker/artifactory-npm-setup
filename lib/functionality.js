'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const axios = require('axios');
const cli = require('command-line-args');
const usage = require('command-line-usage');

const options = require('../options');
const version = require('../package').version;

const homedir = require('os').homedir();

const authEndpoint = '/artifactory/api/npm/auth/';
const authEndpointScoped = '/artifactory/api/npm/npm/auth/';
const userEndpoint = '/artifactory/ui/auth/current';
const apiKeyEndpoint = '/artifactory/ui/userApiKey';

let opts = {};

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

function getOptions() {
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

        return opts;
    } catch (e) {
        printHelpandExit(1, e.message);
    }
}

function validateOptions() {
    if (opts.help) {
        printHelpandExit(0);
    }

    if (opts.scopes && opts.scopes.filter(s => !s.startsWith('@')).length) {
        printHelpandExit(1,'scopes must start with \'@\'');
    }

    if (opts['no-interativity'] && !opts['api-key']) {
        printHelpandExit(1,'you must specify \'api-key\' when running non interactive mode');
    }
}

function getAuthWithAPIKey({username, apiKey}) {
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
    console.log(auth);
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
    return checkIfNpmrcExists()
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
            process.exit(0);
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

function checkIfNpmrcExists() {
    return fsp.access(opts.path, fs.F_OK).then(() => {
        return true;
    }).catch(() => {
        return false;
    });
}

module.exports = {
    printHelpandExit,
    getOptions,
    validateOptions,
    getAuthWithAPIKey,
    getAPICreds
};
