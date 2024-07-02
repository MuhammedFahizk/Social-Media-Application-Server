import mongoose,  { model }  from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  token: { type: String, required: false },

});

const User = model ('User', userSchema);
export default User ;
