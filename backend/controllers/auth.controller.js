import express from "express";
import User from "../model/user.model.js";
import bcrypt from "bcryptjs";
import { generatetokenandsetcookie } from "../lib/utils/generateToken.js";

export const signup = async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    generatetokenandsetcookie(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullname: newUser.fullname,
      followers: newUser.followers,
      following: newUser.following,
      profileimg: newUser.profileimg,
      coverimg: newUser.coverimg,
    });
  } catch (error) {
    console.error("error in signup controller", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    const ispasswordcorrect = await bcrypt.compare(
      password,
      user.password || ""
    );
    if (!ispasswordcorrect || !username) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    generatetokenandsetcookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      followers: user.followers,
      following: user.following,
      profileimg: user.profileimg,
      coverimg: user.coverimg,
    });
  } catch (error) {
    console.error("error in signup controller", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("error in logout controller", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
