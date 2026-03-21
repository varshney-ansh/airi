import { Schema, model, models } from 'mongoose';

const indexSchema = new Schema({
    name: String,
    email: String,
    profile_img: String,
    user_id: String,
    dob: Date,
    country: String,
}, { timestamps: true })

const index = models.index || model('index', indexSchema);

export default index;