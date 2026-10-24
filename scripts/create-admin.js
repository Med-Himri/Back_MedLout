// Creates an admin account, or promotes an existing one.
//   node scripts/create-admin.js you@example.com "Your Name" "a-strong-password"
//   node scripts/create-admin.js you@example.com          (promote existing user)
require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");

const [email, name, password] = process.argv.slice(2);

(async () => {
  if (!email) {
    console.error('Usage: node scripts/create-admin.js <email> ["Name" "password"]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.isadmin = true;
    if (password) existing.password = await bcrypt.hash(password, 10);
    await existing.save();
    console.log(`${email} is now an admin.`);
  } else {
    if (!name || !password || password.length < 8) {
      console.error("New account: give a name and a password of 8+ characters.");
      process.exit(1);
    }
    await User.create({ name, email, password: await bcrypt.hash(password, 10), isadmin: true });
    console.log(`Admin account ${email} created.`);
  }
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
