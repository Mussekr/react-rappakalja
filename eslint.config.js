import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
    {
        files: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        }
    },
    {
        files: ['src/**/*.{js,jsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true }
            },
            globals: {
                ...globals.browser
            }
        },
        settings: {
            react: {
                version: 'detect'
            }
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'indent': ['error', 4],
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'semi': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',
            'max-len': ['error', 160],
            'no-console': 'warn',
            'eqeqeq': 'error'
        }
    },
    {
        files: ['server/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node
            }
        },
        rules: {
            'indent': ['error', 4],
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'semi': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',
            'max-len': ['error', 160],
            'no-console': 'off',
            'eqeqeq': 'error'
        }
    }
];
