import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSchema() {
  console.log('Testing database schema...\n');

  try {
    // Test 1: Create an organization
    console.log('1. Creating organization...');
    const org = await prisma.organization.create({
      data: {
        name: 'Test Organization',
      },
    });
    console.log('✓ Organization created:', org.id);

    // Test 2: Create a vendor
    console.log('\n2. Creating vendor...');
    const vendor = await prisma.vendor.create({
      data: {
        name: 'Test Vendor',
        description: 'A test vendor for autocomplete',
        organizationId: org.id,
      },
    });
    console.log('✓ Vendor created:', vendor.id, '-', vendor.name);

    // Test 3: Create root category
    console.log('\n3. Creating root category...');
    const rootCategory = await prisma.category.create({
      data: {
        name: 'Root Category',
        organizationId: org.id,
        depth: 0,
        isActive: true,
      },
    });
    console.log('✓ Root category created:', rootCategory.id, '-', rootCategory.name);

    // Test 4: Create child category
    console.log('\n4. Creating child category...');
    const childCategory = await prisma.category.create({
      data: {
        name: 'Child Category',
        organizationId: org.id,
        parentId: rootCategory.id,
        depth: 1,
        path: `${rootCategory.id}`,
        isActive: true,
      },
    });
    console.log('✓ Child category created:', childCategory.id, '-', childCategory.name);

    // Test 5: Verify category hierarchy
    console.log('\n5. Verifying category hierarchy...');
    const categoryWithChildren = await prisma.category.findUnique({
      where: { id: rootCategory.id },
      include: { children: true },
    });
    console.log('✓ Root category has', categoryWithChildren.children.length, 'child(ren)');

    // Test 6: Create user
    console.log('\n6. Creating user...');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    console.log('✓ User created:', user.id);

    // Test 7: Create account
    console.log('\n7. Creating account...');
    const account = await prisma.account.create({
      data: {
        name: 'Test Checking',
        accountType: 'CHECKING',
        organizationId: org.id,
        balance: 1000,
      },
    });
    console.log('✓ Account created:', account.id);

    // Test 8: Create transaction with vendor and memo
    console.log('\n8. Creating transaction with vendor and memo...');
    const transaction = await prisma.transaction.create({
      data: {
        memo: 'Test transaction memo',
        amount: 50.00,
        transactionType: 'EXPENSE',
        accountId: account.id,
        vendorId: vendor.id,
        date: new Date(),
      },
      include: {
        vendor: true,
      },
    });
    console.log('✓ Transaction created:', transaction.id);
    console.log('  - Memo:', transaction.memo);
    console.log('  - Vendor:', transaction.vendor?.name);

    // Test 9: Test vendor autocomplete with fuzzy search
    console.log('\n9. Testing vendor fuzzy search...');
    const vendors = await prisma.$queryRaw`
      SELECT id, name, similarity(name, 'Test Vend') as similarity
      FROM vendors
      WHERE organization_id = ${org.id}
        AND name % 'Test Vend'
      ORDER BY similarity DESC
      LIMIT 5
    `;
    console.log('✓ Found', vendors.length, 'vendor(s) with fuzzy search');
    vendors.forEach((v) => {
      console.log(`  - ${v.name} (similarity: ${v.similarity.toFixed(3)})`);
    });

    console.log('\n✅ All tests passed!');
    console.log('\nDatabase schema verification summary:');
    console.log('- Vendor model: ✓');
    console.log('- Category hierarchy: ✓');
    console.log('- Transaction memo field: ✓');
    console.log('- Transaction vendor relation: ✓');
    console.log('- Trigram fuzzy search: ✓');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    console.log('\nCleaning up test data...');
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
    console.log('✓ Cleanup complete');
  }
}

testSchema()
  .then(() => {
    console.log('\n✅ Schema verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Schema verification failed:', error);
    process.exit(1);
  });
