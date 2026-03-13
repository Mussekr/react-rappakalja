const defaultOpts = {
    credentials: 'same-origin'
};

const request = (url, opts) => fetch(url, { ...defaultOpts, ...opts })
    .then(resp => resp.status < 400 ? resp : Promise.reject(resp));

const json = (url, opts) => request(url, opts)
    .then(resp => resp.text())
    .then(text => {
        try {
            return JSON.parse(text);
        } catch (err) {
            return Promise.reject(new Error(`Trying to parse an invalid JSON object: ${text}`));
        }
    })
    .catch(err => typeof err.json === 'function' ? err.json().then(val => Promise.reject(val)) : err);

const post = (url, body, opts = {}) =>
    json(url, {
        ...opts,
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            ...opts.headers
        }
    });

export default {
    request,
    json,
    post
};
