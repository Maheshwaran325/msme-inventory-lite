import { test, expect } from '@playwright/test';

test.describe('Search and Filter Functionality', () => {
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

    // Mock API responses with sample products
    await page.route('**/api/products*', async (route) => {
      const url = new URL(route.request().url());
      const searchParam = url.searchParams.get('search');
      const categoryParam = url.searchParams.get('category');
      
      // Sample products data
      const allProducts = [
        {
          id: '1',
          name: 'Laptop Pro',
          sku: 'LAP-001',
          category: 'Electronics',
          quantity: 10,
          unit_price: 999.99,
          version: 1
        },
        {
          id: '2',
          name: 'Office Chair',
          sku: 'CHR-001',
          category: 'Furniture',
          quantity: 25,
          unit_price: 199.99,
          version: 1
        },
        {
          id: '3',
          name: 'Wireless Mouse',
          sku: 'MOU-001',
          category: 'Electronics',
          quantity: 50,
          unit_price: 29.99,
          version: 1
        },
        {
          id: '4',
          name: 'Standing Desk',
          sku: 'DSK-001',
          category: 'Furniture',
          quantity: 15,
          unit_price: 399.99,
          version: 1
        }
      ];

      let filteredProducts = allProducts;

      // Apply search filter (exact name match, case-insensitive)
      if (searchParam) {
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase() === searchParam.toLowerCase()
        );
      }

      // Apply category filter
      if (categoryParam && categoryParam !== 'All') {
        filteredProducts = filteredProducts.filter(p => 
          p.category === categoryParam
        );
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: filteredProducts,
          count: filteredProducts.length
        })
      });
    });

    await page.goto('/products');
  });

  test('should filter products by exact name search', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Office Chair')).toBeVisible();

    // Search for exact product name
    await page.fill('input[placeholder="Type exact product name"]', 'Laptop Pro');

    // Wait for search to be applied (debounced)
    await page.waitForTimeout(400);

    // Should only show the matching product
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Office Chair')).not.toBeVisible();
    await expect(page.locator('text=Wireless Mouse')).not.toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Office Chair')).toBeVisible();

    // Click on Electronics category filter
    await page.click('button:has-text("Electronics")');

    // Wait for filter to be applied
    await page.waitForTimeout(400);

    // Should only show Electronics products
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Wireless Mouse')).toBeVisible();
    await expect(page.locator('text=Office Chair')).not.toBeVisible();
    await expect(page.locator('text=Standing Desk')).not.toBeVisible();
  });

  test('should combine search and category filters', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Laptop Pro')).toBeVisible();

    // First apply category filter
    await page.click('button:has-text("Electronics")');
    await page.waitForTimeout(400);

    // Then apply search filter
    await page.fill('input[placeholder="Type exact product name"]', 'Laptop Pro');
    await page.waitForTimeout(400);

    // Should only show the product that matches both filters
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Wireless Mouse')).not.toBeVisible();
    await expect(page.locator('text=Office Chair')).not.toBeVisible();
  });

  test('should clear all filters when Clear button is clicked', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Laptop Pro')).toBeVisible();

    // Apply filters
    await page.fill('input[placeholder="Type exact product name"]', 'Laptop Pro');
    await page.click('button:has-text("Electronics")');
    await page.waitForTimeout(400);

    // Verify filters are applied
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Office Chair')).not.toBeVisible();

    // Click Clear button
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(400);

    // Should show all products again
    await expect(page.locator('text=Laptop Pro')).toBeVisible();
    await expect(page.locator('text=Office Chair')).toBeVisible();
    await expect(page.locator('text=Wireless Mouse')).toBeVisible();
    await expect(page.locator('text=Standing Desk')).toBeVisible();

    // Verify search input is cleared
    await expect(page.locator('input[placeholder="Type exact product name"]')).toHaveValue('');
    
    // Verify "All" category is selected
    await expect(page.locator('button:has-text("All")').first()).toHaveClass(/bg-blue-600/);
  });

  test('should show no results message when search returns empty', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Laptop Pro')).toBeVisible();

    // Search for non-existent product
    await page.fill('input[placeholder="Type exact product name"]', 'Non-existent Product');
    await page.waitForTimeout(400);

    // Should show no products
    await expect(page.locator('text=Laptop Pro')).not.toBeVisible();
    await expect(page.locator('text=Office Chair')).not.toBeVisible();
    
    // Should show count as 0
    await expect(page.locator('text=Showing 0 of')).toBeVisible();
  });

  test('should highlight active category filter', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Laptop Pro')).toBeVisible();

    // Initially "All" should be active
    await expect(page.locator('button:has-text("All")').first()).toHaveClass(/bg-blue-600/);

    // Click Electronics category
    await page.click('button:has-text("Electronics")');

    // Electronics should now be active
    await expect(page.locator('button:has-text("Electronics")').first()).toHaveClass(/bg-blue-600/);
    await expect(page.locator('button:has-text("All")').first()).not.toHaveClass(/bg-blue-600/);
  });

  test('should update product count display when filtering', async ({ page }) => {
    // Wait for products to load
    await expect(page.locator('text=Showing 4 of')).toBeVisible();

    // Apply Electronics filter
    await page.click('button:has-text("Electronics")');
    await page.waitForTimeout(400);

    // Should show filtered count
    await expect(page.locator('text=Showing 2 of')).toBeVisible();
  });
});