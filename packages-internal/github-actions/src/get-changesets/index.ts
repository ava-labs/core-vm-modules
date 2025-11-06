import readChangesets from '@changesets/read';
import * as core from '@actions/core';
import * as colors from 'colorette';

async function run(): Promise<void> {
  try {
    const changesets = await readChangesets(process.cwd());

    const hasChangesets = changesets.length > 0;

    // eslint-disable-next-line no-console
    console.info(`Changesets detected: ${colors.green(hasChangesets.toString())}`);

    core.setOutput('hasChangesets', hasChangesets.toString());
  } catch (error) {
    core.setFailed((error as { message: string }).message);
  }
}

run();
