import { test, expect } from '@playwright/test';

test.describe('Conflict Resolution Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', 'mock-token');
      window.localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'owner'
      }));
    });

    // Mock API responses
    await page.route('**/api/products', async (route) => {
      const url = route.request().url();
      
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: '1',
                name: 'Test Product',
                sku: 'TEST-001',
                category: 'Test Category',
                quantity: 10,
                unit_price: 9.99,
                version: 1
              }
            ]
          })
        });
      }
    });

    await page.route('**/api/products/1', async (route) => {
      const method = route.request().method();
      
      if (method === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        
        // Simulate version conflict
        if (body.version === 1) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'CONFLICT',
                message: 'Stale update — product has changed',
                details: {
                  resource: 'product',
                  id: '1',
                  expected_version: 1,
                  actual_version: 3
                }
              }
            })
          });
        } else {
          // Successful update
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: [{ ...body, version: body.version + 1 }]
            })
          });
        }
      }
    });

    await page.goto('/products');
  });

  test('should show conflict modal when version conflict occurs', async ({ page }) => {
    // Click edit button on the first product
    await page.click('text=Edit');

    // Wait for modal to appear
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify the product
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.fill('input[name="quantity"]', '15');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for conflict modal to appear
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();
    await expect(page.locator('text=Stale update — product has changed')).toBeVisible();
    await expect(page.locator('text=Expected version: 1, Actual version: 3')).toBeVisible();
  });

  test('should handle "Keep Mine" resolution', async ({ page }) => {
    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify and submit
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.click('button[type="submit"]');

    // Wait for conflict modal
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();

    // Click "Keep Mine"
    await page.click('text=Keep Mine');

    // Verify modal is closed and form is submitted
    await expect(page.locator('text=Conflict Resolution')).not.toBeVisible();
  });

  test('should handle "Accept Remote" resolution', async ({ page }) => {
    // Mock the current product data for "Accept Remote"
    await page.route('**/api/products/1', async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: '1',
              name: 'Remote Updated Product',
              sku: 'TEST-001',
              category: 'Remote Category',
              quantity: 20,
              unit_price: 15.99,
              version: 3
            }
          })
        });
      } else if (method === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        
        if (body.version === 1) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'CONFLICT',
                message: 'Stale update — product has changed',
                details: {
                  resource: 'product',
                  id: '1',
                  expected_version: 1,
                  actual_version: 3
                }
              }
            })
          });
        }
      }
    });

    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify and submit
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.click('button[type="submit"]');

    // Wait for conflict modal
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();

    // Click "Accept Remote"
    await page.click('text=Accept Remote');

    // Verify form is updated with remote data
    await expect(page.locator('input[name="name"]')).toHaveValue('Remote Updated Product');
    await expect(page.locator('input[name="quantity"]')).toHaveValue('20');
  });

  test('should handle "Merge Manually" resolution', async ({ page }) => {
    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify and submit
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.click('button[type="submit"]');

    // Wait for conflict modal
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();

    // Modify the merged data
    await page.fill('input[value="Updated Product Name"]', 'Merged Product Name');
    await page.fill('input[value="15"]', '25');

    // Click "Merge Manually"
    await page.click('text=Merge Manually');

    // Verify modal is closed
    await expect(page.locator('text=Conflict Resolution')).not.toBeVisible();
  });

  test('should show permission error for staff trying to modify unit price', async ({ page }) => {
    // Mock staff user
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'staff'
      }));
    });

    // Mock permission error
    await page.route('**/api/products/1', async (route) => {
      const method = route.request().method();
      
      if (method === 'PUT') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'PERMISSION_EDIT_PRICE',
              message: 'Staff members cannot modify unit price',
              details: {
                resource: 'product',
                id: '1',
                field: 'unit_price'
              }
            }
          })
        });
      }
    });

    // Reload page to get updated user role
    await page.reload();

    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Verify unit price field is disabled
    await expect(page.locator('input[name="unit_price"]')).toBeDisabled();
    await expect(page.locator('text=(Read-only for staff)')).toBeVisible();

    // Try to modify unit price
    await page.fill('input[name="name"]', 'Updated Product');
    await page.fill('input[name="unit_price"]', '15.99');
    await page.click('button[type="submit"]');

    // Verify permission error is shown
    await expect(page.locator('text=Staff members cannot modify unit price')).toBeVisible();
  });

  test('should close conflict modal when clicking close button', async ({ page }) => {
    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify and submit
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.click('button[type="submit"]');

    // Wait for conflict modal
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();

    // Click close button (X)
    await page.click('[aria-label="Close"]');

    // Verify modal is closed
    await expect(page.locator('text=Conflict Resolution')).not.toBeVisible();
  });

  test('should display client data in conflict modal', async ({ page }) => {
    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify and submit
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.fill('input[name="quantity"]', '25');
    await page.click('button[type="submit"]');

    // Wait for conflict modal
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();

    // Verify client data is displayed
    await expect(page.locator('text=Updated Product Name')).toBeVisible();
    await expect(page.locator('text=25')).toBeVisible();
  });

  test('should allow editing merged data in manual merge form', async ({ page }) => {
    // Click edit button
    await page.click('text=Edit');
    await expect(page.locator('text=Edit Product')).toBeVisible();

    // Modify and submit
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.click('button[type="submit"]');

    // Wait for conflict modal
    await expect(page.locator('text=Conflict Resolution')).toBeVisible();

    // Verify manual merge form fields are editable
    const nameInput = page.locator('input[value="Updated Product Name"]');
    await expect(nameInput).toBeEditable();

    // Modify the merged data
    await nameInput.fill('Manually Merged Product');
    await page.fill('input[value="15"]', '30');

    // Click "Merge Manually"
    await page.click('text=Merge Manually');

    // Verify modal is closed
    await expect(page.locator('text=Conflict Resolution')).not.toBeVisible();
  });
});
