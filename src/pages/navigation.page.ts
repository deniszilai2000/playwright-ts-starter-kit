import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ArgonQA™ Application Shell & Navigation Page Object (`NavigationPage`)
 *
 * Encapsulates the application header, sidebar navigation, user profile menu,
 * and global layout assertions.
 */
export class NavigationPage extends BasePage {
  private readonly sidebarNav: Locator;
  private readonly userAvatarMenu: Locator;
  private readonly signOutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebarNav = this.getByTestId('app-sidebar').or(this.page.getByRole('navigation'));
    this.userAvatarMenu = this.getByTestId('user-avatar-menu').or(this.getByTestAttr('user-menu'));
    this.signOutButton = this.getByTestId('sign-out-button').or(
      this.page.getByRole('menuitem', { name: /sign out|log out/i })
    );
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

  async signOut(): Promise<void> {
    await this.step('Sign out via user profile menu', async () => {
      await this.clickElement(this.userAvatarMenu, 'User Avatar Menu');
      await this.clickElement(this.signOutButton, 'Sign Out Button');
    });
  }
}
