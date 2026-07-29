# Web tests

The web repo had no test runner configured. These tests are authored and ready;
enable them by installing the tooling.

## Unit (Jest + React Testing Library)

```
npm i -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest
```
Add to package.json scripts: `"test": "jest"`. Config: `jest.config.mjs` (uses
`next/jest`), setup: `jest.setup.ts`. Tests live in `tests/unit/`.

Run: `npm test`