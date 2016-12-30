const defaultOpts = {
    credentials: 'same-origin'
};

const request = (url, opts, ...rest) => fetch(url, Object.assign({}, defaultOpts, opts), ...rest)
    .then(resp => resp.status < 400 ? resp : Promise.reject(resp));

const json = (...args) => request(...args)
    .then(resp => resp.text())
    .then(text => {
        try {
            return JSON.parse(text);
        } catch(err) {
            return Promise.reject(new Error(`Trying to parse an invalid JSON object: ${text}`));
        }
    })
    .catch(err => typeof err.json === 'function' ? err.json().then(val => Promise.reject(val)) : err);

const post = (url, body, opts = {}, ...rest) =>
    json(url, Object.assign({}, opts, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: Object.assign({
            'Content-Type': 'application/json'
        }, opts.headers)
    }), ...rest);

const del = (url, opts = {}, ...rest) =>
    json(url, Object.assign({}, opts, {method: 'DELETE'}), ...rest);

module.exports = {
    request,
    json,
    post,
    del
};
