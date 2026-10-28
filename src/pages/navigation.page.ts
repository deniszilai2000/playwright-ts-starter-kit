import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ArgonQA™ Application Shell, Catalog & Checkout Page Object (`NavigationPage`)
 *
 * Encapsulates navigation, authentication, catalog sorting, and multi-step checkout
 * interactions using strict `getByTestId` (`data-test`) and `fillSecure` primitives.
 */
export class NavigationPage extends BasePage {
  private readonly sidebarNav: Locator;
  private readonly userAvatarMenu: Locator;
  private readonly signOutButton: Locator;

  // Interactive Showcase Locators (data-test attributes via getByTestId)
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly inventoryTitle: Locator;
  private readonly sortDropdown: Locator;
  private readonly backpackAddButton: Locator;
  private readonly bikeLightAddButton: Locator;
  private readonly cartBadge: Locator;
  private readonly cartLink: Locator;
  private readonly checkoutButton: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly postalCodeInput: Locator;
  private readonly continueButton: Locator;
  private readonly finishButton: Locator;
  private readonly completeHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebarNav = this.getByTestId('app-sidebar').or(this.page.getByRole('navigation'));
    this.userAvatarMenu = this.getByTestId('user-avatar-menu').or(this.getByTestAttr('user-menu'));
    this.signOutButton = this.getByTestId('sign-out-button').or(
      this.page.getByRole('menuitem', { name: /sign out|log out/i })
    );

    this.usernameInput = this.getByTestId('username');
    this.passwordInput = this.getByTestId('password');
    this.loginButton = this.getByTestId('login-button');
    this.inventoryTitle = this.getByTestId('title');
    this.sortDropdown = this.getByTestId('product-sort-container');
    this.backpackAddButton = this.getByTestId('add-to-cart-sauce-labs-backpack');
    this.bikeLightAddButton = this.getByTestId('add-to-cart-sauce-labs-bike-light');
    this.cartBadge = this.getByTestId('shopping-cart-badge');
    this.cartLink = this.getByTestId('shopping-cart-link');
    this.checkoutButton = this.getByTestId('checkout');
    this.firstNameInput = this.getByTestId('firstName');
    this.lastNameInput = this.getByTestId('lastName');
    this.postalCodeInput = this.getByTestId('postalCode');
    this.continueButton = this.getByTestId('continue');
    this.finishButton = this.getByTestId('finish');
    this.completeHeader = this.getByTestId('complete-header');
  }

  async openSidebarSection(sectionName: string): Promise<void> {
    await this.step(`Navigate to sidebar section "${sectionName}"`, async () => {
      const link = this.sidebarNav.getByRole('link', { name: sectionName, exact: true });
      await this.clickElement(link, `Sidebar link "${sectionName}"`);
    });
  }

  async expectPageTitleToMatch(pattern: RegExp | string): Promise<void> {
    await this.step(`Verify page title matches "${String(pattern)}"`, async () => {
      await expect(this.page).toHaveTitle(pattern);
    });
  }

  async authenticateDemoPortal(username: string, secretPassword: string): Promise<void> {
    await this.step(`Authenticate into portal as "${username}"`, async () => {
      await this.fillField(this.usernameInput, username, 'Username Input');
      await this.fillSecure(this.passwordInput, secretPassword, 'Portal Password');
      await this.clickElement(this.loginButton, 'Sign In Button');
      await this.expectIsVisible(this.inventoryTitle);
    });
  }

  async sortCatalogBy(optionValue: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.step(`Sort product catalog by "${optionValue}"`, async () => {
      await this.sortDropdown.selectOption(optionValue);
    });
  }

  async addCoreItemsToCart(): Promise<void> {
    await this.step('Add 2 enterprise items to shopping cart and verify badge count', async () => {
      await this.clickElement(this.backpackAddButton, 'Add Sauce Labs Backpack');
      await this.clickElement(this.bikeLightAddButton, 'Add Sauce Labs Bike Light');
      await expect(this.cartBadge).toHaveText('2');
    });
  }

  async completeCheckoutFlow(firstName: string, lastName: string, zipCode: string): Promise<void> {
    await this.step('Complete multi-step checkout workflow and verify order confirmation', async () => {
      await this.clickElement(this.cartLink, 'Shopping Cart Link');
      await this.clickElement(this.checkoutButton, 'Checkout Button');
      await this.fillField(this.firstNameInput, firstName, 'First Name');
      await this.fillField(this.lastNameInput, lastName, 'Last Name');
      await this.fillField(this.postalCodeInput, zipCode, 'Postal Code');
      await this.clickElement(this.continueButton, 'Continue Checkout Button');
      await this.clickElement(this.finishButton, 'Finish Order Button');
      await expect(this.completeHeader).toHaveText(/Thank you for your order!/i);
    });
  }

  async signOut(): Promise<void> {
    await this.step('Sign out via user profile menu', async () => {
      await this.clickElement(this.userAvatarMenu, 'User Avatar Menu');
      await this.clickElement(this.signOutButton, 'Sign Out Button');
    });
  }
}
