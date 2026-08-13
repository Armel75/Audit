import { test, expect } from '@playwright/test';

// =============================================================================
// Smoke tests e2e — page de connexion
// Prérequis : application démarrée (http://localhost/audit)
// =============================================================================
test.describe('Page de connexion', () => {
  test('le formulaire de connexion se charge correctement', async ({ page }) => {
    await page.goto('/');

    // Titre du panneau de connexion
    await expect(page.getByText('Connexion à votre espace')).toBeVisible();

    // Champs du formulaire
    await expect(page.getByPlaceholder('jean.dupont@sorepco.com')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Bouton principal
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('un mauvais mot de passe affiche une erreur', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('jean.dupont@sorepco.com').fill('admin@audit.local');
    await page.locator('input[type="password"]').fill('mauvais-mot-de-passe');

    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText('Identifiant ou mot de passe invalide')).toBeVisible();
  });
});
