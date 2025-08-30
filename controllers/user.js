const jwt = require("jsonwebtoken");
const User = require("../models/User");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      msg: "Bad request. Please add email and password in the request body",
    });
  }

  let foundUser = await User.findOne({ email: req.body.email });
  if (foundUser) {
    const isMatch = await foundUser.comparePassword(password);

    if (isMatch) {
      const payload = {
        sub: String(foundUser._id),
        id: String(foundUser._id),
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        branches: foundUser.branches,
      };
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: "30d",
        }
      );

      return res.status(200).json({ msg: "user logged in", token });
    } else {
      return res.status(400).json({ msg: "Bad password" });
    }
  } else {
    return res.status(400).json({ msg: "Bad credentails" });
  }
};

const dashboard = async (req, res) => {
  const luckyNumber = Math.floor(Math.random() * 100);

  res.status(200).json({
    msg: `Hello, ${req.user.name}`,
    secret: `Here is your authorized data, your lucky number is ${luckyNumber}`,
  });
};

const getAllUsers = async (req, res) => {
  let users = await User.find({});

  return res.status(200).json({ users });
};

const register = async (req, res) => {
  let foundUser = await User.findOne({ email: req.body.email });
  if (foundUser === null) {
    let { username, email, password, role = 'manager', branches } = req.body;
    if (username.length && email.length && password.length) {
      const person = new User({
        name: username,
        email: email,
        password: password,
        role: role === 'admin' ? 'admin' : 'manager',
        branches: role === 'admin' ? '*' : (Array.isArray(branches) && branches.length ? branches : ['main'])
      });
      await person.save();
      const payload = {
        sub: String(person._id),
        id: String(person._id),
        name: person.name,
        email: person.email,
        role: person.role,
        branches: person.branches,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.status(201).json({ person, token });
    }else{
        return res.status(400).json({msg: "Please add all values in the request body"});
    }
  } else {
    return res.status(400).json({ msg: "Email already in use" });
  }
};

module.exports = {
  login,
  register,
  dashboard,
  getAllUsers,
};
