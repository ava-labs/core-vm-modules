<br/>

<p align="center">
  <a href="https://www.avax.network/">
      <picture>
        <img alt="Avalanche Logo" src="https://images.ctfassets.net/gcj8jwzm6086/Gse8dqDEnJtT87RsbbEf4/1609daeb09e9db4a6617d44623028356/Avalanche_Horizontal_White.svg" width="auto" height="60">
      </picture>
</a>
</p>

<h1 align="center">VM Modules</h1>

## Getting Started 🚀

```sh
pnpm i        # installs all dependencies
pnpm build    # builds all packages
```

## What's inside? 🔍

### Packages

#### External

> These Packages are published to NPM

- `evm-module`: EVM module

#### Internal

> These packages are only used internally within this repo

- `types`: shared types for modules
- `tsconfig`: tsconfig for modules
- `eslint-config-custom`: eslint config for modules
- `github-actions`: custom github actions

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Useful commands

- `pnpm build` - Build all packages
- `pnpm dev` - Develop all packages
- `pnpm lint` - Lint all packages
- `pnpm changeset` - Generate a changeset. See in #versioning-and-publishing-packages

## Versioning and Publishing packages

### Versioning

Checkout to a new branch and run only `pnpm changeset` and follow the CLI prompts to put in the summary and it will create the xxx.md file under .changeset directory. Push the change to this new branch and create a PR.

Once the PR is merged, a new PR will be auto generated to bump the version to packages listed in the xxx.md file, and the summary in CHANGELOG.md

### Publishing

Package publishing has been configured using [Changesets](https://github.com/changesets/changesets). Please review their [documentation](https://github.com/changesets/changesets#documentation) to familiarize yourself with the workflow.

This repo has an automated npm releases setup in a [GitHub Action](https://github.com/changesets/action) using the [Changesets bot](https://github.com/apps/changeset-bot).
