"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting comprehensive category seeding...\n');
    console.log('👕 Creating Fashion & Apparel categories...');
    const fashion = await prisma.category.create({
        data: {
            id: 'cat-fashion',
            name: 'Fashion & Apparel',
            image: 'https://picsum.photos/seed/fashion/200',
            isActive: true,
        },
    });
    const mensWear = await prisma.category.create({
        data: {
            id: 'cat-mens-wear',
            name: "Men's Wear",
            parentId: fashion.id,
            image: 'https://picsum.photos/seed/menswear/200',
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-mens-shirts', name: 'Shirts', parentId: mensWear.id, isActive: true },
            { id: 'cat-mens-tshirts', name: 'T-Shirts', parentId: mensWear.id, isActive: true },
            { id: 'cat-mens-jeans', name: 'Jeans', parentId: mensWear.id, isActive: true },
            { id: 'cat-mens-trousers', name: 'Trousers', parentId: mensWear.id, isActive: true },
            { id: 'cat-mens-footwear', name: 'Footwear', parentId: mensWear.id, isActive: true },
        ],
    });
    const womensWear = await prisma.category.create({
        data: {
            id: 'cat-womens-wear',
            name: "Women's Wear",
            parentId: fashion.id,
            image: 'https://picsum.photos/seed/womenswear/200',
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-womens-tops', name: 'Tops & Tunics', parentId: womensWear.id, isActive: true },
            { id: 'cat-womens-dresses', name: 'Dresses', parentId: womensWear.id, isActive: true },
            { id: 'cat-womens-jeans', name: 'Jeans', parentId: womensWear.id, isActive: true },
            { id: 'cat-womens-sarees', name: 'Sarees', parentId: womensWear.id, isActive: true },
            { id: 'cat-womens-footwear', name: 'Footwear', parentId: womensWear.id, isActive: true },
        ],
    });
    const kidsWear = await prisma.category.create({
        data: {
            id: 'cat-kids-wear',
            name: "Kids' Wear",
            parentId: fashion.id,
            image: 'https://picsum.photos/seed/kidswear/200',
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-boys-clothing', name: 'Boys Clothing', parentId: kidsWear.id, isActive: true },
            { id: 'cat-girls-clothing', name: 'Girls Clothing', parentId: kidsWear.id, isActive: true },
            { id: 'cat-kids-footwear', name: 'Kids Footwear', parentId: kidsWear.id, isActive: true },
        ],
    });
    console.log('✅ Fashion categories created\n');
    console.log('📱 Creating Electronics categories...');
    const electronics = await prisma.category.create({
        data: {
            id: 'cat-electronics',
            name: 'Electronics',
            image: 'https://picsum.photos/seed/electronics/200',
            isActive: true,
        },
    });
    const mobiles = await prisma.category.create({
        data: {
            id: 'cat-mobiles',
            name: 'Mobile Phones',
            parentId: electronics.id,
            image: 'https://picsum.photos/seed/mobiles/200',
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-smartphones', name: 'Smartphones', parentId: mobiles.id, isActive: true },
            { id: 'cat-feature-phones', name: 'Feature Phones', parentId: mobiles.id, isActive: true },
            { id: 'cat-mobile-accessories', name: 'Mobile Accessories', parentId: mobiles.id, isActive: true },
        ],
    });
    const computers = await prisma.category.create({
        data: {
            id: 'cat-computers',
            name: 'Computers & Laptops',
            parentId: electronics.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-laptops', name: 'Laptops', parentId: computers.id, isActive: true },
            { id: 'cat-desktops', name: 'Desktops', parentId: computers.id, isActive: true },
            { id: 'cat-computer-accessories', name: 'Computer Accessories', parentId: computers.id, isActive: true },
        ],
    });
    const audioVideo = await prisma.category.create({
        data: {
            id: 'cat-audio-video',
            name: 'Audio & Video',
            parentId: electronics.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-headphones', name: 'Headphones', parentId: audioVideo.id, isActive: true },
            { id: 'cat-speakers', name: 'Speakers', parentId: audioVideo.id, isActive: true },
            { id: 'cat-cameras', name: 'Cameras', parentId: audioVideo.id, isActive: true },
        ],
    });
    console.log('✅ Electronics categories created\n');
    console.log('🏠 Creating Home & Kitchen categories...');
    const homeKitchen = await prisma.category.create({
        data: {
            id: 'cat-home-kitchen',
            name: 'Home & Kitchen',
            image: 'https://picsum.photos/seed/home/200',
            isActive: true,
        },
    });
    const furniture = await prisma.category.create({
        data: {
            id: 'cat-furniture',
            name: 'Furniture',
            parentId: homeKitchen.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-living-room', name: 'Living Room Furniture', parentId: furniture.id, isActive: true },
            { id: 'cat-bedroom', name: 'Bedroom Furniture', parentId: furniture.id, isActive: true },
            { id: 'cat-kitchen-furniture', name: 'Kitchen Furniture', parentId: furniture.id, isActive: true },
        ],
    });
    const appliances = await prisma.category.create({
        data: {
            id: 'cat-appliances',
            name: 'Appliances',
            parentId: homeKitchen.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-large-appliances', name: 'Large Appliances', parentId: appliances.id, isActive: true },
            { id: 'cat-small-appliances', name: 'Small Appliances', parentId: appliances.id, isActive: true },
        ],
    });
    console.log('✅ Home & Kitchen categories created\n');
    console.log('🛒 Creating Groceries categories...');
    const groceries = await prisma.category.create({
        data: {
            id: 'cat-groceries',
            name: 'Groceries & Food',
            image: 'https://picsum.photos/seed/groceries/200',
            isActive: true,
        },
    });
    const freshProduce = await prisma.category.create({
        data: {
            id: 'cat-fresh-produce',
            name: 'Fresh Produce',
            parentId: groceries.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-fruits', name: 'Fruits', parentId: freshProduce.id, isActive: true },
            { id: 'cat-vegetables', name: 'Vegetables', parentId: freshProduce.id, isActive: true },
            { id: 'cat-herbs', name: 'Herbs & Seasonings', parentId: freshProduce.id, isActive: true },
        ],
    });
    const packagedFoods = await prisma.category.create({
        data: {
            id: 'cat-packaged-foods',
            name: 'Packaged Foods',
            parentId: groceries.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-snacks', name: 'Snacks', parentId: packagedFoods.id, isActive: true },
            { id: 'cat-beverages', name: 'Beverages', parentId: packagedFoods.id, isActive: true },
            { id: 'cat-instant-foods', name: 'Instant Foods', parentId: packagedFoods.id, isActive: true },
        ],
    });
    const dairyBakery = await prisma.category.create({
        data: {
            id: 'cat-dairy-bakery',
            name: 'Dairy & Bakery',
            parentId: groceries.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-milk-products', name: 'Milk & Cream', parentId: dairyBakery.id, isActive: true },
            { id: 'cat-bread', name: 'Bread & Buns', parentId: dairyBakery.id, isActive: true },
            { id: 'cat-cakes', name: 'Cakes & Pastries', parentId: dairyBakery.id, isActive: true },
        ],
    });
    console.log('✅ Groceries categories created\n');
    console.log('💄 Creating Beauty & Personal Care categories...');
    const beauty = await prisma.category.create({
        data: {
            id: 'cat-beauty',
            name: 'Beauty & Personal Care',
            image: 'https://picsum.photos/seed/beauty/200',
            isActive: true,
        },
    });
    const skincare = await prisma.category.create({
        data: {
            id: 'cat-skincare',
            name: 'Skincare',
            parentId: beauty.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-face-care', name: 'Face Care', parentId: skincare.id, isActive: true },
            { id: 'cat-body-care', name: 'Body Care', parentId: skincare.id, isActive: true },
            { id: 'cat-sun-care', name: 'Sun Care', parentId: skincare.id, isActive: true },
        ],
    });
    const haircare = await prisma.category.create({
        data: {
            id: 'cat-haircare',
            name: 'Haircare',
            parentId: beauty.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-shampoo', name: 'Shampoo & Conditioner', parentId: haircare.id, isActive: true },
            { id: 'cat-hair-styling', name: 'Hair Styling', parentId: haircare.id, isActive: true },
            { id: 'cat-hair-color', name: 'Hair Color', parentId: haircare.id, isActive: true },
        ],
    });
    const makeup = await prisma.category.create({
        data: {
            id: 'cat-makeup',
            name: 'Makeup',
            parentId: beauty.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-face-makeup', name: 'Face Makeup', parentId: makeup.id, isActive: true },
            { id: 'cat-eye-makeup', name: 'Eye Makeup', parentId: makeup.id, isActive: true },
            { id: 'cat-lip-makeup', name: 'Lip Makeup', parentId: makeup.id, isActive: true },
        ],
    });
    console.log('✅ Beauty categories created\n');
    console.log('⚽ Creating Sports & Fitness categories...');
    const sports = await prisma.category.create({
        data: {
            id: 'cat-sports',
            name: 'Sports & Fitness',
            image: 'https://picsum.photos/seed/sports/200',
            isActive: true,
        },
    });
    const exercise = await prisma.category.create({
        data: {
            id: 'cat-exercise',
            name: 'Exercise Equipment',
            parentId: sports.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-cardio', name: 'Cardio Equipment', parentId: exercise.id, isActive: true },
            { id: 'cat-strength', name: 'Strength Training', parentId: exercise.id, isActive: true },
            { id: 'cat-yoga', name: 'Yoga Equipment', parentId: exercise.id, isActive: true },
        ],
    });
    const sportsGear = await prisma.category.create({
        data: {
            id: 'cat-sports-gear',
            name: 'Sports Gear',
            parentId: sports.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-cricket', name: 'Cricket', parentId: sportsGear.id, isActive: true },
            { id: 'cat-football', name: 'Football', parentId: sportsGear.id, isActive: true },
            { id: 'cat-badminton', name: 'Badminton', parentId: sportsGear.id, isActive: true },
        ],
    });
    console.log('✅ Sports categories created\n');
    console.log('📚 Creating Books & Stationery categories...');
    const books = await prisma.category.create({
        data: {
            id: 'cat-books',
            name: 'Books & Stationery',
            image: 'https://picsum.photos/seed/books/200',
            isActive: true,
        },
    });
    const booksCategory = await prisma.category.create({
        data: {
            id: 'cat-books-main',
            name: 'Books',
            parentId: books.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-fiction', name: 'Fiction', parentId: booksCategory.id, isActive: true },
            { id: 'cat-non-fiction', name: 'Non-Fiction', parentId: booksCategory.id, isActive: true },
            { id: 'cat-educational', name: 'Educational', parentId: booksCategory.id, isActive: true },
        ],
    });
    const stationery = await prisma.category.create({
        data: {
            id: 'cat-stationery',
            name: 'Stationery',
            parentId: books.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-writing', name: 'Writing Instruments', parentId: stationery.id, isActive: true },
            { id: 'cat-notebooks', name: 'Notebooks & Diaries', parentId: stationery.id, isActive: true },
            { id: 'cat-art-supplies', name: 'Art Supplies', parentId: stationery.id, isActive: true },
        ],
    });
    console.log('✅ Books & Stationery categories created\n');
    console.log('🧸 Creating Toys & Games categories...');
    const toys = await prisma.category.create({
        data: {
            id: 'cat-toys',
            name: 'Toys & Games',
            image: 'https://picsum.photos/seed/toys/200',
            isActive: true,
        },
    });
    const kidsToys = await prisma.category.create({
        data: {
            id: 'cat-kids-toys',
            name: 'Kids Toys',
            parentId: toys.id,
            isActive: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-educational-toys', name: 'Educational Toys', parentId: kidsToys.id, isActive: true },
            { id: 'cat-action-figures', name: 'Action Figures', parentId: kidsToys.id, isActive: true },
            { id: 'cat-dolls', name: 'Dolls', parentId: kidsToys.id, isActive: true },
        ],
    });
    await prisma.category.createMany({
        data: [
            { id: 'cat-board-games', name: 'Board Games', parentId: toys.id, isActive: true },
            { id: 'cat-outdoor-games', name: 'Outdoor Games', parentId: toys.id, isActive: true },
        ],
    });
    console.log('✅ Toys & Games categories created\n');
    const totalCategories = await prisma.category.count();
    const parentCategories = await prisma.category.count({ where: { parentId: null } });
    const childCategories = totalCategories - parentCategories;
    console.log('\n🎉 Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total Categories: ${totalCategories}`);
    console.log(`   Parent Categories: ${parentCategories}`);
    console.log(`   Child Categories: ${childCategories}\n`);
    console.log('✅ Category Groups:');
    console.log('   1. Fashion & Apparel (Men, Women, Kids)');
    console.log('   2. Electronics (Mobiles, Computers, Audio/Video)');
    console.log('   3. Home & Kitchen (Furniture, Appliances)');
    console.log('   4. Groceries & Food (Fresh, Packaged, Dairy)');
    console.log('   5. Beauty & Personal Care (Skincare, Haircare, Makeup)');
    console.log('   6. Sports & Fitness (Equipment, Gear)');
    console.log('   7. Books & Stationery');
    console.log('   8. Toys & Games\n');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-comprehensive-categories.js.map