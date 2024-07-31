import { Injectable } from '@nestjs/common';
import chalk from 'chalk';
import { Spinner } from 'cli-spinner';

@Injectable()
export class LoggingService {
  private spinner: Spinner | null = null;

  startSpinner(message: string): void {
    this.spinner = new Spinner(message + ' %s');
    this.spinner.setSpinnerString('|/-\\');
    this.spinner.start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.setSpinnerTitle(message + ' %s');
    }
  }

  stopSpinner(successMessage?: string): void {
    if (this.spinner) {
      this.spinner.stop(true);
      this.spinner = null;
      if (successMessage) {
        console.log(chalk.green(`✔ ${successMessage}`));
      }
    }
  }

  log(message: string): void {
    console.log(message);
  }

  info(message: string): void {
    console.log(chalk.cyan(message));
  }

  success(message: string): void {
    console.log(chalk.green(message));
  }

  warn(message: string): void {
    console.log(chalk.yellow(message));
  }

  error(message: string): void {
    console.error(chalk.red(message));
  }
}
