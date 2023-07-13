# Node TypeScript starter

This is a repository to bootstrap node and TypeScript project quickly. It has prettier and eslint set up, and you can use .env file to provide environment variables.

The setup is opinionated, as author prefers it. Maybe you'll like it, too...

## Prerequisities

Node (v16+) and yarn installed

## Installation

1. clone this repository `git clone https://github.com/mrkvon/node-typescript-starter.git name-of-your-project`
2. go to project folder `cd name-of-your-project`
3. install node modules `yarn`
4. rename project in [`package.json`](./package.json)
5. optional: `cp .env.sample .env` if you want to use .env for defining environment variables, like secrets etc.
6. optional: also feel free to remove or change license (LICENSE file and entry in package.json), and this README

## Usage

- run `yarn start`
- develop your project starting from `src/index.ts`

## License

MIT
