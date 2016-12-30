module.exports = {
    "env": {
        "node": true,
        "es6": true
    },
    "extends": "../.eslintrc.js",
    "parserOptions": {
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        },
        "sourceType": "module"
    },
    "rules": {
      "no-console": "off",
      "semi": "error",
      "strict": "off"
    }
};
