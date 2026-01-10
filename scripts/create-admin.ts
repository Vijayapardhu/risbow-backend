import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('risbow123', 10);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: 'admin.risbow@gmail.com' }
        });

        if (existingUser) {
            console.log('❌ User with email admin.risbow@gmail.com already exists');
            console.log('User ID:', existingUser.id);
            console.log('Role:', existingUser.role);

            // Update to ADMIN role if not already
            if (existingUser.role !== 'ADMIN' && existingUser.role !== 'SUPER_ADMIN') {
                const updated = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        role: 'ADMIN',
                        password: hashedPassword // Update password too
                    }
                });
                console.log('✅ Updated existing user to ADMIN role and reset password');
                console.log('Updated user:', updated);
            }
            return;
        }

        // Create new admin user
        const adminUser = await prisma.user.create({
            data: {
                email: 'admin.risbow@gmail.com',
                mobile: '+918888888888', // Unique mobile number for admin
                name: 'Admin User',
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ACTIVE',
                coinsBalance: 0,
            }
        });

        console.log('✅ Admin user created successfully!');
        console.log('-----------------------------------');
        console.log('Email:', adminUser.email);
        console.log('Password: risbow123');
        console.log('Role:', adminUser.role);
        console.log('User ID:', adminUser.id);
        console.log('-----------------------------------');
        console.log('You can now login with these credentials');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser();
