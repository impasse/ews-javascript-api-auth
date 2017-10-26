const { Curl } = require('node-libcurl');

function setupResponse(statusCode, body, headers) {
    const statusText = (headers.result || {}).reason;
    headers = headers[0];
    delete headers.result;
    return {
        status: statusCode,
        redirectCount: 0,
        headers: headers,
        responseType: '',
        statusText,
        responseText: body,
        getAllResponseHeaders() {
            let header = '';
            for (const name in headers) {
                header += `${name}: ${headers[name]}\r\n`;
            }
            return header;
        },
        getResponseHeader(name) {
            if (!name) { return null };
            if (headers[name]) { return headers[name]; }
            const lowCaseName = name.toLocaleLowerCase();
            if (headers[lowCaseName]) { return headers[lowCaseName]; }
        },
    };
}

class Authorization {
    constructor(username, password, sslVerify = true) {
        this.username = username;
        this.password = password;
        this.sslVerify = sslVerify;
    }

    xhr(xhroptions, progressDelegate) {
        const { type = 'GET', url, headers = {}, data } = xhroptions;
        if (headers.Authorization) {
            delete headers.Authorization;
        }
        return new Promise((resolve, reject) => {
            const curl = new Curl();
            curl.setOpt(Curl.option.URL, url);
            curl.setOpt(Curl.option.FOLLOWLOCATION, true);
            curl.setOpt(Curl.option.HTTPHEADER, Object.keys(headers).map(k => `${k}: ${headers[k]}`));
            // curl.setOpt(Curl.option.HTTPAUTH, Curl.auth.NTLM);
            curl.setOpt(Curl.option.USERNAME, this.username);
            curl.setOpt(Curl.option.PASSWORD, this.password);
            if (!this.sslVerify) {
                curl.setOpt(Curl.option.SSL_VERIFYHOST, false);
                curl.setOpt(Curl.option.SSL_VERIFYPEER, false);
            }
            switch (type) {
                case 'GET':
                    break;
                case 'POST':
                    curl.setOpt(Curl.option.POST, true);
                    curl.setOpt(Curl.option.POSTFIELDS, data);
                    break;
                default:
                    curl.setOpt(Curl.option.CUSTOMREQUEST, type);
                    break;
            }
            curl.on('error', (err, errCode) => {
                curl.close();
                reject(err);
            });
            curl.on('end', (statusCode, body, headers) => {
                if (statusCode === 200) {
                    resolve(setupResponse(statusCode, body, headers));
                } else {
                    reject(setupResponse(statusCode, body, headers));
                }
                curl.close();
            });
            curl.perform();
        });
    }

    xhrStream(xhroptions, progressDelegate) {
        const { type = 'GET', url, headers = {}, data } = xhroptions;
        if (headers.Authorization) {
            delete headers.Authorization;
        }
        return new Promise((resolve, reject) => {
            const curl = new Curl();
            this.curl = curl;
            curl.setOpt(Curl.option.URL, url);
            curl.setOpt(Curl.option.FOLLOWLOCATION, true);
            curl.setOpt(Curl.option.TCP_KEEPALIVE, true);
            curl.setOpt(Curl.option.HTTPHEADER, Object.keys(headers).map(k => `${k}: ${headers[k]}`));
            // curl.setOpt(Curl.option.HTTPAUTH, Curl.auth.NTLM);
            curl.setOpt(Curl.option.USERNAME, this.username);
            curl.setOpt(Curl.option.PASSWORD, this.password);
            if (!this.sslVerify) {
                curl.setOpt(Curl.option.SSL_VERIFYHOST, false);
                curl.setOpt(Curl.option.SSL_VERIFYPEER, false);
            }
            switch (type) {
                case 'GET':
                    break;
                case 'POST':
                    curl.setOpt(Curl.option.POST, true);
                    curl.setOpt(Curl.option.POSTFIELDS, data);
                    break;
                default:
                    curl.setOpt(Curl.option.CUSTOMREQUEST, type);
                    break;
            }
            curl.setOpt(Curl.option.HEADERFUNCTION, (chunk, size, nmemb) => {
                const [name, value] = chunk.toString().split(': ');
                progressDelegate({ type: "header", headers: {name: value} });
                return size * nmemb;
            });
            curl.setOpt(Curl.option.WRITEFUNCTION, (chunk, size, nmemb) => {
                progressDelegate({ type: "data", data: chunk.toString() });
                return size * nmemb;
            });
            curl.on('error', (err, errCode) => {
                progressDelegate({ type: "error", error: err });
                curl.close();
                reject(err);
            });
            curl.on('end', (statusCode, body, headers) => {
                progressDelegate({ type: "end" });
                curl.close();
                resolve();
            });
            curl.perform();
        });
    }

    disconnect() {
        if (this.curl) {
            curl.close();
        }
    }

    get apiName() {
        return 'curl';
    }
}

module.exports = { Authorization };
