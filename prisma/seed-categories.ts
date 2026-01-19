import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting category and specification seeding...');

    // --- Electronics Category ---
    const electronics = await prisma.category.upsert({
        where: { id: 'cat_electronics' },
        update: {},
        create: {
            id: 'cat_electronics',
            name: 'Electronics',
            nameTE: 'ఎలక్ట్రానిక్స్',
            isActive: true,
        },
    });
    console.log('✅ Created Electronics category');

    // Mobiles subcategory
    const mobiles = await prisma.category.upsert({
        where: { id: 'cat_mobiles' },
        update: {},
        create: {
            id: 'cat_mobiles',
            name: 'Mobiles',
            nameTE: 'మొబైల్స్',
            parentId: electronics.id,
            isActive: true,
        },
    });

    // Smartphones subcategory
    const smartphones = await prisma.category.upsert({
        where: { id: 'cat_smartphones' },
        update: {},
        create: {
            id: 'cat_smartphones',
            name: 'Smartphones',
            nameTE: 'స్మార్ట్‌ఫోన్లు',
            parentId: mobiles.id,
            isActive: true,
        },
    });
    console.log('✅ Created Mobiles > Smartphones hierarchy');

    // Smartphone Specifications
    const smartphoneSpecs = [
        { key: 'brand', label: 'Brand', labelTE: 'బ్రాండ్', type: 'TEXT', required: true, sortOrder: 1 },
        { key: 'ram', label: 'RAM', labelTE: 'RAM', type: 'SELECT', required: true, options: ['2GB', '4GB', '6GB', '8GB', '12GB', '16GB'], sortOrder: 2 },
        { key: 'storage', label: 'Storage', labelTE: 'నిల్వ', type: 'SELECT', required: true, options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'], sortOrder: 3 },
        { key: 'screen_size', label: 'Screen Size', labelTE: 'స్క్రీన్ పరిమాణం', type: 'NUMBER', unit: 'inches', required: true, sortOrder: 4 },
        { key: 'battery', label: 'Battery Capacity', labelTE: 'బ్యాటరీ సామర్థ్యం', type: 'NUMBER', unit: 'mAh', required: true, sortOrder: 5 },
        { key: 'color', label: 'Color', labelTE: 'రంగు', type: 'SELECT', required: true, options: ['Black', 'White', 'Blue', 'Red', 'Green', 'Gold', 'Silver'], sortOrder: 6 },
        { key: '5g_enabled', label: '5G Enabled', labelTE: '5G ఉంది', type: 'BOOLEAN', required: false, sortOrder: 7 },
        { key: 'processor', label: 'Processor', labelTE: 'ప్రాసెసర్', type: 'TEXT', required: false, sortOrder: 8 },
        { key: 'camera_mp', label: 'Main Camera', labelTE: 'ప్రధాన కెమెరా', type: 'NUMBER', unit: 'MP', required: false, sortOrder: 9 },
    ];

    for (const spec of smartphoneSpecs) {
        await prisma.categorySpec.upsert({
            where: {
                categoryId_key: {
                    categoryId: smartphones.id,
                    key: spec.key,
                },
            },
            update: {},
            create: {
                categoryId: smartphones.id,
                key: spec.key,
                label: spec.label,
                labelTE: spec.labelTE,
                type: spec.type as any,
                unit: ('unit' in spec ? spec.unit : undefined) as string | undefined,
                required: spec.required,
                options: ('options' in spec ? spec.options : undefined) as string[] | undefined,
                sortOrder: spec.sortOrder,
            },
        });
    }
    console.log('✅ Created Smartphone specifications');

    // --- Fashion Category ---
    const fashion = await prisma.category.upsert({
        where: { id: 'cat_fashion' },
        update: {},
        create: {
            id: 'cat_fashion',
            name: 'Fashion',
            nameTE: 'ఫ్యాషన్',
            isActive: true,
        },
    });
    console.log('✅ Created Fashion category');

    // Men's Fashion
    const mensFashion = await prisma.category.upsert({
        where: { id: 'cat_mens_fashion' },
        update: {},
        create: {
            id: 'cat_mens_fashion',
            name: "Men's Fashion",
            nameTE: 'పురుషుల ఫ్యాషన్',
            parentId: fashion.id,
            isActive: true,
        },
    });

    // Men's Shirts
    const mensShirts = await prisma.category.upsert({
        where: { id: 'cat_mens_shirts' },
        update: {},
        create: {
            id: 'cat_mens_shirts',
            name: 'Shirts',
            nameTE: 'షర్టులు',
            parentId: mensFashion.id,
            isActive: true,
        },
    });
    console.log('✅ Created Men\'s Fashion > Shirts hierarchy');

    // Shirt Specifications
    const shirtSpecs = [
        { key: 'brand', label: 'Brand', labelTE: 'బ్రాండ్', type: 'TEXT', required: true, sortOrder: 1 },
        { key: 'size', label: 'Size', labelTE: 'పరిమాణం', type: 'SELECT', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], sortOrder: 2 },
        { key: 'color', label: 'Color', labelTE: 'రంగు', type: 'SELECT', required: true, options: ['White', 'Black', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Grey'], sortOrder: 3 },
        { key: 'material', label: 'Material', labelTE: 'పదార్థం', type: 'SELECT', required: true, options: ['Cotton', 'Polyester', 'Linen', 'Silk', 'Blend'], sortOrder: 4 },
        { key: 'fit', label: 'Fit', labelTE: 'ఫిట్', type: 'SELECT', required: false, options: ['Slim Fit', 'Regular Fit', 'Loose Fit'], sortOrder: 5 },
        { key: 'sleeve', label: 'Sleeve Type', labelTE: 'స్లీవ్ రకం', type: 'SELECT', required: false, options: ['Full Sleeve', 'Half Sleeve', 'Sleeveless'], sortOrder: 6 },
    ];

    for (const spec of shirtSpecs) {
        await prisma.categorySpec.upsert({
            where: {
                categoryId_key: {
                    categoryId: mensShirts.id,
                    key: spec.key,
                },
            },
            update: {},
            create: {
                categoryId: mensShirts.id,
                key: spec.key,
                label: spec.label,
                labelTE: spec.labelTE,
                type: spec.type as any,
                unit: ('unit' in spec ? spec.unit : undefined) as string | undefined,
                required: spec.required,
                options: ('options' in spec ? spec.options : undefined) as string[] | undefined,
                sortOrder: spec.sortOrder,
            },
        });
    }
    console.log('✅ Created Shirt specifications');

    // --- Healthcare Category ---
    const healthcare = await prisma.category.upsert({
        where: { id: 'cat_healthcare' },
        update: {},
        create: {
            id: 'cat_healthcare',
            name: 'Healthcare',
            nameTE: 'ఆరోగ్య సంరక్షణ',
            isActive: true,
        },
    });
    console.log('✅ Created Healthcare category');

    // Medicines subcategory
    const medicines = await prisma.category.upsert({
        where: { id: 'cat_medicines' },
        update: {},
        create: {
            id: 'cat_medicines',
            name: 'Medicines',
            nameTE: 'మందులు',
            parentId: healthcare.id,
            isActive: true,
        },
    });
    console.log('✅ Created Healthcare > Medicines hierarchy');

    // Medicine Specifications (Regulated)
    const medicineSpecs = [
        { key: 'brand', label: 'Brand', labelTE: 'బ్రాండ్', type: 'TEXT', required: true, sortOrder: 1 },
        { key: 'manufacturer', label: 'Manufacturer', labelTE: 'తయారీదారు', type: 'TEXT', required: true, sortOrder: 2 },
        { key: 'composition', label: 'Composition', labelTE: 'కూర్పు', type: 'TEXT', required: true, sortOrder: 3 },
        { key: 'mrp', label: 'MRP', labelTE: 'MRP', type: 'NUMBER', unit: '₹', required: true, sortOrder: 4 },
        { key: 'schedule_type', label: 'Schedule Type', labelTE: 'షెడ్యూల్ రకం', type: 'SELECT', required: true, options: ['H', 'H1', 'X', 'G', 'OTC'], sortOrder: 5 },
        { key: 'prescription_required', label: 'Prescription Required', labelTE: 'ప్రిస్క్రిప్షన్ అవసరం', type: 'BOOLEAN', required: true, sortOrder: 6 },
        { key: 'expiry_date', label: 'Expiry Date', labelTE: 'గడువు తేదీ', type: 'TEXT', required: true, sortOrder: 7 },
        { key: 'batch_number', label: 'Batch Number', labelTE: 'బ్యాచ్ నంబర్', type: 'TEXT', required: false, sortOrder: 8 },
        { key: 'dosage_form', label: 'Dosage Form', labelTE: 'మోతాదు రూపం', type: 'SELECT', required: false, options: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment'], sortOrder: 9 },
    ];

    for (const spec of medicineSpecs) {
        await prisma.categorySpec.upsert({
            where: {
                categoryId_key: {
                    categoryId: medicines.id,
                    key: spec.key,
                },
            },
            update: {},
            create: {
                categoryId: medicines.id,
                key: spec.key,
                label: spec.label,
                labelTE: spec.labelTE,
                type: spec.type as any,
                unit: ('unit' in spec ? spec.unit : undefined) as string | undefined,
                required: spec.required,
                options: ('options' in spec ? spec.options : undefined) as string[] | undefined,
                sortOrder: spec.sortOrder,
            },
        });
    }
    console.log('✅ Created Medicine specifications (Regulated)');

    // --- Groceries Category ---
    const groceries = await prisma.category.upsert({
        where: { id: 'cat_groceries' },
        update: {},
        create: {
            id: 'cat_groceries',
            name: 'Groceries',
            nameTE: 'కిరాణా సామాను',
            isActive: true,
        },
    });
    console.log('✅ Created Groceries category');

    // Fruits & Vegetables
    const fruitsVeg = await prisma.category.upsert({
        where: { id: 'cat_fruits_veg' },
        update: {},
        create: {
            id: 'cat_fruits_veg',
            name: 'Fruits & Vegetables',
            nameTE: 'పండ్లు & కూరగాయలు',
            parentId: groceries.id,
            isActive: true,
        },
    });
    console.log('✅ Created Groceries > Fruits & Vegetables hierarchy');

    // Fruits & Vegetables Specifications
    const fruitsVegSpecs = [
        { key: 'type', label: 'Type', labelTE: 'రకం', type: 'SELECT', required: true, options: ['Fruit', 'Vegetable'], sortOrder: 1 },
        { key: 'variety', label: 'Variety', labelTE: 'రకం', type: 'TEXT', required: false, sortOrder: 2 },
        { key: 'organic', label: 'Organic', labelTE: 'సేంద్రీయ', type: 'BOOLEAN', required: false, sortOrder: 3 },
        { key: 'origin', label: 'Origin', labelTE: 'మూలం', type: 'TEXT', required: false, sortOrder: 4 },
    ];

    for (const spec of fruitsVegSpecs) {
        await prisma.categorySpec.upsert({
            where: {
                categoryId_key: {
                    categoryId: fruitsVeg.id,
                    key: spec.key,
                },
            },
            update: {},
            create: {
                categoryId: fruitsVeg.id,
                key: spec.key,
                label: spec.label,
                labelTE: spec.labelTE,
                type: spec.type as any,
                unit: ('unit' in spec ? spec.unit : undefined) as string | undefined,
                required: spec.required,
                options: ('options' in spec ? spec.options : undefined) as string[] | undefined,
                sortOrder: spec.sortOrder,
            },
        });
    }
    console.log('✅ Created Fruits & Vegetables specifications');

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Electronics > Mobiles > Smartphones (9 specs)');
    console.log('- Fashion > Men\'s Fashion > Shirts (6 specs)');
    console.log('- Healthcare > Medicines (9 specs - REGULATED)');
    console.log('- Groceries > Fruits & Vegetables (4 specs)');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
