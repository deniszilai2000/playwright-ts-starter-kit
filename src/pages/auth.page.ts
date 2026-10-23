import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Enterprise Authentication Page Object (`AuthPage`)
 *
 * Handles SSO / IAM sign-in flows with `fillSecure` credential masking
 * so passwords or tokens never appear in HTML or Allure step logs.
 * Configure selectors for the client application during `/project-setup`.
 */
export class AuthPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByHook('auth-username').or(this.getByTestId('username'));
    this.passwordInput = this.getByHook('auth-password').or(this.getByTestId('password'));
    this.submitButton = this.getByHook('auth-submit').or(this.getByTestId('login-submit'));
    this.errorAlert = this.getByHook('auth-error').or(this.page.getByRole('alert'));
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
