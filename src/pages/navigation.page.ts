import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Global Application Shell & Navigation Page Object (`NavigationPage`)
 *
 * Encapsulates the application header, sidebar navigation, user avatar menu,
 * theme toggle, and global layout assertions.
 */
export class NavigationPage extends BasePage {
  private readonly sidebarNav: Locator;
  private readonly userAvatarMenu: Locator;
  private readonly signOutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebarNav = this.getByHook('app-sidebar').or(this.page.getByRole('navigation'));
    this.userAvatarMenu = this.getByHook('user-avatar-menu').or(this.getByTestId('user-menu'));
    this.signOutButton = this.getByHook('sign-out-button').or(
      this.page.getByRole('menuitem', { name: /sign out|log out|cerrar sesión/i })
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
    await this.step('Sign out via user avatar menu', async () => {
      await this.clickElement(this.userAvatarMenu, 'User Avatar Menu');
      await this.clickElement(this.signOutButton, 'Sign Out Button');
    });
  }
}
