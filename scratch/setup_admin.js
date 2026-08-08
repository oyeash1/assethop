// scratch/setup_admin.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/modules/auth/user.model');
const { hashPassword } = require('../src/shared/utils/encrypt');

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Find any SUPER_ADMIN
    const admins = await User.find({ role: 'SUPER_ADMIN' }).select('+password');
    if (admins.length > 0) {
      console.log('Existing SUPER_ADMIN users found:');
      for (const admin of admins) {
        console.log(`- Name: ${admin.name}, Email: ${admin.email}, Phone: ${admin.phoneNumber}`);
      }
    } else {
      console.log('No SUPER_ADMIN user found. Creating one...');
      const email = 'admin@assethop.com';
      const passwordPlain = 'AdminAssetHop2026!';
      const hashedPassword = await hashPassword(passwordPlain);
      
      const newAdmin = new User({
        name: 'Super Admin',
        email: email,
        phoneNumber: '9999999999',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        kycStatus: 'VERIFIED'
      });
      
      await newAdmin.save();
      console.log('SUPER_ADMIN user successfully created!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${passwordPlain}`);
    }
  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

run();
