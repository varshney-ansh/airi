import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: String,
    email: String,
    profile_img: String,
    user_id: String,
    dob: Date,
    country: String,
}, { timestamps: true })

const User = models.User || model('User', UserSchema);

export default User;