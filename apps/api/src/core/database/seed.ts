// Env is loaded via `node --env-file=../../.env` in the db:seed script.
import { db } from './db';
import * as schema from './schema';

async function seed() {
  console.log('Seeding database...');

  // ── Categories ──────────────────────────────────────────────────────────────
  const categoryRows = await db
    .insert(schema.categories)
    .values([
      { name: 'Mobile Phones', slug: 'mobile-phones', sortOrder: 0 },
      { name: 'Laptops', slug: 'laptops', sortOrder: 1 },
      { name: 'Tablets', slug: 'tablets', sortOrder: 2 },
      { name: 'TVs & Displays', slug: 'tvs-displays', sortOrder: 3 },
      { name: 'Audio & Headphones', slug: 'audio-headphones', sortOrder: 4 },
      { name: 'Accessories', slug: 'accessories', sortOrder: 5 },
      { name: 'Smart Home', slug: 'smart-home', sortOrder: 6 },
      { name: 'Gaming', slug: 'gaming', sortOrder: 7 },
      { name: 'Cameras', slug: 'cameras', sortOrder: 8 },
    ])
    .onConflictDoNothing()
    .returning({ id: schema.categories.id, slug: schema.categories.slug });
  console.log(`Seeded ${categoryRows.length} categories`);

  // ── Brands ───────────────────────────────────────────────────────────────────
  const brandRows = await db
    .insert(schema.brands)
    .values([
      { name: 'Samsung', slug: 'samsung', isFeatured: true, sortOrder: 0 },
      { name: 'Apple', slug: 'apple', isFeatured: true, sortOrder: 1 },
      { name: 'Tecno', slug: 'tecno', isFeatured: true, sortOrder: 2 },
      { name: 'Infinix', slug: 'infinix', isFeatured: true, sortOrder: 3 },
      { name: 'Itel', slug: 'itel', sortOrder: 4 },
      { name: 'Nokia', slug: 'nokia', sortOrder: 5 },
      { name: 'HP', slug: 'hp', isFeatured: true, sortOrder: 6 },
      { name: 'Lenovo', slug: 'lenovo', isFeatured: true, sortOrder: 7 },
      { name: 'Dell', slug: 'dell', sortOrder: 8 },
      { name: 'Acer', slug: 'acer', sortOrder: 9 },
      { name: 'Hisense', slug: 'hisense', isFeatured: true, sortOrder: 10 },
      { name: 'LG', slug: 'lg', sortOrder: 11 },
      { name: 'TCL', slug: 'tcl', sortOrder: 12 },
      { name: 'Sony', slug: 'sony', isFeatured: true, sortOrder: 13 },
      { name: 'JBL', slug: 'jbl', isFeatured: true, sortOrder: 14 },
      { name: 'Anker', slug: 'anker', sortOrder: 15 },
      { name: 'Oraimo', slug: 'oraimo', isFeatured: true, sortOrder: 16 },
      { name: 'Xiaomi', slug: 'xiaomi', sortOrder: 17 },
      { name: 'Huawei', slug: 'huawei', sortOrder: 18 },
    ])
    .onConflictDoNothing()
    .returning({ id: schema.brands.id, slug: schema.brands.slug });
  console.log(`Seeded ${brandRows.length} brands`);

  // ── Shipping Zones ────────────────────────────────────────────────────────────
  const zoneRows = await db
    .insert(schema.shippingZones)
    .values([
      {
        name: 'Lagos Express',
        states: ['Lagos'],
        baseRate: '800',
        ratePerKg: '100',
        freeShippingThreshold: '50000',
        podEnabled: true,
        carrier: 'SELF',
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
      },
      {
        name: 'South-West',
        states: ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
        baseRate: '1500',
        ratePerKg: '150',
        freeShippingThreshold: '75000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 2,
        estimatedDaysMax: 4,
      },
      {
        name: 'South-South',
        states: ['Rivers', 'Delta', 'Bayelsa', 'Akwa Ibom', 'Cross River', 'Edo'],
        baseRate: '2000',
        ratePerKg: '200',
        freeShippingThreshold: '100000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
      },
      {
        name: 'South-East',
        states: ['Anambra', 'Enugu', 'Imo', 'Abia', 'Ebonyi'],
        baseRate: '2000',
        ratePerKg: '200',
        freeShippingThreshold: '100000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
      },
      {
        name: 'North-West',
        states: ['Kano', 'Kaduna', 'Sokoto', 'Kebbi', 'Zamfara', 'Katsina', 'Jigawa'],
        baseRate: '2500',
        ratePerKg: '250',
        freeShippingThreshold: '120000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 4,
        estimatedDaysMax: 7,
      },
      {
        name: 'North-Central (FCT)',
        states: ['FCT', 'Niger', 'Kwara', 'Kogi', 'Benue', 'Plateau', 'Nasarawa'],
        baseRate: '2000',
        ratePerKg: '200',
        freeShippingThreshold: '100000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
      },
      {
        name: 'North-East',
        states: ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
        baseRate: '3000',
        ratePerKg: '300',
        freeShippingThreshold: '150000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 5,
        estimatedDaysMax: 8,
      },
      {
        name: 'Nationwide (all other states)',
        states: [],
        baseRate: '2500',
        ratePerKg: '250',
        freeShippingThreshold: '120000',
        podEnabled: false,
        carrier: 'GIG',
        estimatedDaysMin: 4,
        estimatedDaysMax: 7,
      },
    ])
    .onConflictDoNothing()
    .returning({ id: schema.shippingZones.id, name: schema.shippingZones.name });
  console.log(`Seeded ${zoneRows.length} shipping zones`);

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
