"use server";

import User from "@/schemas/userSchema";
import connectDB from "./mongodb"

export const RegisterNewUser = async({ data }) =>{
    try{
        await connectDB();
        const { name, email, profile_img, user_id, dob, country } = data;

        const existing = await User.findOne({ user_id });
        if (existing) return { success: false, message: "User already exists" };

        const newUser = new User({
            name,
            email,
            profile_img,
            user_id,
            dob,
            country
        });
        const res = await newUser.save();
        if(res){
            console.log("New user registered:", res);
            return { success: true, message: "User registered successfully" };
        }
    } catch (error) {
        console.error("Error registering new user:", error);
        return { success: false, message: "Error registering new user" };
    }
}