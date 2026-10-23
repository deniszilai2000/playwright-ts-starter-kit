import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ArgonQA™ Enterprise Authentication Page Object (`AuthPage`)
 *
 * Handles SSO / IAM sign-in flows with `fillSecure` credential masking
 * so passwords or tokens never appear in HTML, JUnit, or Allure step logs.
 */
export class AuthPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId('auth-username').or(this.getByTestAttr('username'));
    this.passwordInput = this.getByTestId('auth-password').or(this.getByTestAttr('password'));
    this.submitButton = this.getByTestId('auth-submit').or(this.getByTestAttr('login-submit'));
    this.errorAlert = this.getByTestId('auth-error').or(this.page.getByRole('alert'));
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.step(`Sign in as "${username}"`, async () => {
      await this.fillField(this.usernameInput, username, 'Username');
      await this.fillSecure(this.passwordInput, password, 'Password');
      await this.clickElement(this.submitButton, 'Sign In Submit');
    });
  }

  async expectAuthErrorVisible(expectedMessage?: string): Promise<void> {
    await this.step('Verify authentication error alert is displayed', async () => {
      await expect(this.errorAlert).toBeVisible();
      if (expectedMessage) {
        await expect(this.errorAlert).toContainText(expectedMessage);
      }
    });
  }
}
