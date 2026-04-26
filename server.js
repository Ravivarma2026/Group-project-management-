const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = "secretkey";

// MongoDB connect
mongoose.connect("mongodb://127.0.0.1:27017/project_manager");

// Models
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Project = mongoose.model("Project", {
  name: String,
  owner: String,
  columns: Array
});

// Middleware
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("No token");

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
}

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  const user = new User({ username, password: hash });
  await user.save();

  res.send("User created");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Wrong password");

  const token = jwt.sign({ username }, SECRET);
  res.json({ token });
});

// Create project
app.post("/projects", auth, async (req, res) => {
  const project = new Project({
    name: req.body.name,
    owner: req.user.username,
    columns: [
      { name: "Todo", cards: [] },
      { name: "Doing", cards: [] },
      { name: "Done", cards: [] }
    ]
  });

  await project.save();
  res.json(project);
});

// Get projects
app.get("/projects", auth, async (req, res) => {
  const projects = await Project.find({ owner: req.user.username });
  res.json(projects);
});

// Add task
app.post("/projects/:id/task", auth, async (req, res) => {
  const { columnIndex, text } = req.body;

  const project = await Project.findById(req.params.id);
  project.columns[columnIndex].cards.push({
    text,
    assigned: req.user.username,
    comments: []
  });

  await project.save();
  res.json(project);
});

// Add comment
app.post("/projects/:id/comment", auth, async (req, res) => {
  const { columnIndex, cardIndex, comment } = req.body;

  const project = await Project.findById(req.params.id);
  project.columns[columnIndex].cards[cardIndex]
    .comments.push(req.user.username + ": " + comment);

  await project.save();
  res.json(project);
});

// Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));