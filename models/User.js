const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    isadmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // Never send the password hash to a client.
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
