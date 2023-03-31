const mongoose = require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username cannot be blank "],
        unique: true
    },
    email: {
        type:String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: [true, "Please provide a password"]
    }
});
// UserSchema.plugin(passportLocalMongoose);//PassportLocalmongoose will add a username, 
module.exports = mongoose.model("User", UserSchema);//hash and salt field to store the username,
                                            //the hashed password and the salt value