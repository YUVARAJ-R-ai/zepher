import { select, confirm } from '@inquirer/prompts';
import { getAllIntegrations, getIntegration } from '@zepher/integrations';
import chalk from 'chalk';

export async function runIntegrationTui(projectRoot: string) {
  console.log(chalk.bold.blue('\nZepher Integration Manager (Interactive)\n'));

  while (true) {
    const integrations = getAllIntegrations();
    const choices = [];

    for (const i of integrations) {
      const status = await i.detect(projectRoot);
      const isEnabled = status.installed;
      const mark = isEnabled ? chalk.green('✓') : chalk.gray('~');
      
      choices.push({
        name: `${mark} ${i.name} ${chalk.dim(`- ${i.description}`)}`,
        value: i.id,
        description: isEnabled ? chalk.green('Enabled') : chalk.gray('Not configured')
      });
    }

    choices.push({ name: chalk.red('Exit'), value: 'exit' });

    const selectedId = await select({
      message: 'Select an integration to manage:',
      choices,
    });

    if (selectedId === 'exit') {
      console.log('Exiting...');
      break;
    }

    const integration = getIntegration(selectedId);
    if (!integration) continue;

    const status = await integration.detect(projectRoot);
    console.log(chalk.cyan(`\nManaging ${integration.name}`));

    if (status.installed) {
      const action = await select({
        message: 'This integration is currently ENABLED. What would you like to do?',
        choices: [
          { name: 'View Status/Doctor', value: 'doctor' },
          { name: chalk.red('Disable / Remove'), value: 'disable' },
          { name: 'Back', value: 'back' }
        ]
      });

      if (action === 'doctor') {
        const d = await integration.doctor(projectRoot);
        console.log(`\nHealth: ${d.healthy ? chalk.green('✓ healthy') : chalk.red('✗ broken/unavailable')}`);
        d.checks.forEach(c => console.log(`  - ${c.name}: ${c.passed ? chalk.green('Passed') : chalk.red('Failed')}`));
        console.log();
      } else if (action === 'disable') {
        const confirmDisable = await confirm({ message: `Are you sure you want to disable ${integration.name}?` });
        if (confirmDisable) {
          await integration.disable(projectRoot);
          console.log(chalk.green(`\n✓ Disabled ${integration.name}`));
        }
      }
    } else {
      const action = await select({
        message: 'This integration is currently NOT CONFIGURED. What would you like to do?',
        choices: [
          { name: chalk.green('Enable / Configure'), value: 'enable' },
          { name: 'Back', value: 'back' }
        ]
      });

      if (action === 'enable') {
        console.log(chalk.blue(`\nConfiguring ${integration.name}...`));
        await integration.enable(projectRoot);
        console.log(chalk.green(`✓ Successfully enabled ${integration.name}\n`));
      }
    }
  }
}
