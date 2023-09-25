const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

const SECRET = "SECr3t"; // This should be in an environment variable in a real application

// Define mongoose schemas
const userSchema = new mongoose.Schema({
  username: { type: String },
  password: String,
  userIds: [String],
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  published: Boolean,
});

const kidStudySchema = new mongoose.Schema({
  kidId: String,
  courseTitle: String,
  hoursStudied: Number,
});

// Define mongoose models
const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Course = mongoose.model("Course", courseSchema);
const KidStudy = mongoose.model("KidStudy", kidStudySchema);

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://jackcruiser800:mynameisrama@cluster0.ixxmiav.mongodb.net/",
  { useNewUrlParser: true, useUnifiedTopology: true, dbName: "courses" }
);

//                                                  COURSE ADMIN ROUTES

app.post("/admin/signup", (req, res) => {
  const { username, password } = req.body;
  function callback(admin) {
    if (admin) {
      res.status(403).json({ message: "Admin already exists" });
    } else {
      const obj = { username: username, password: password };
      const newAdmin = new Admin(obj);
      newAdmin.save();
      const token = jwt.sign({ username, role: "admin" }, SECRET, {
        expiresIn: "1h",
      });
      res.json({ message: "Admin created successfully", token });
    }
  }
  Admin.findOne({ username }).then(callback);
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.headers;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: "admin" }, SECRET, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in successfully", token });
  } else {
    res.status(403).json({ message: "Invalid username or password" });
  }
});

app.post("/admin/courses", authenticateJwt, async (req, res) => {
  const course = new Course(req.body);
  await course.save();
  res.json({ message: "Course created successfully", courseId: course.id });
});

app.get("/admin/courses", authenticateJwt, async (req, res) => {
  const courses = await Course.find({});
  res.json({ courses });
});

//                                                  USER PARENT ROUTES

const generateRandomUserId = (length = 8) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let userId = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    userId += characters.charAt(randomIndex);
  }

  return userId;
};
// parent registering for course
app.post("/users/signup", async (req, res) => {
  const { username, password, noOfKids } = req.body;
  const user = await User.findOne({ username });

  if (user) {
    return res.status(403).json({ message: "User already exists" });
  } else {
    const userIds = [];
    for (let i = 1; i <= noOfKids; i++) {
      const generatedUserId = generateRandomUserId();
      userIds.push(generatedUserId);
    }

    const newUser = new User({ username, password, userIds });
    await newUser.save();

    const token = jwt.sign({ username, role: "user" }, SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "User created successfully", token, userIds });
  }
});

// Parent accessing kid's activity
app.get("/parent/kids-activity/:kidId", async (req, res) => {
  const kidId = req.params.kidId;
  const user = await User.findOne({ userIds: kidId });

  if (!user) {
    return res.status(404).json({ message: "Kid not found" });
  }

  const kidStudyRecords = await KidStudy.find({ kidId });

  res.json({
    message: "Kid's study records retrieved successfully",
    kidStudyRecords: kidStudyRecords,
  });
});

//                                                            KID ROUTES

// kid login
app.get("/kids/courses/:kidId", async (req, res) => {
  const kidId = req.params.kidId;
  const user = await User.findOne({ userIds: kidId });

  if (!user) {
    return res.status(404).json({ message: "Kid not found" });
  }
  const coursesForKid = await Course.find({});

  res.json({
    message: "Courses retrieved successfully",
    courses: coursesForKid,
  });
});

// kid study
app.post("/kids/study/:kidId", async (req, res) => {
  const kidId = req.params.kidId;
  const { courseTitle, hoursStudied } = req.body;
  const user = await User.findOne({ userIds: kidId });

  if (!user) {
    return res.status(404).json({ message: "Kid not found" });
  }
  const kid = new KidStudy({
    kidId,
    courseTitle,
    hoursStudied,
  });

  // Save the kid activity data to the database
  await kid.save();

  res.json({
    message: "Study recorded successfully",
    recordedActivity: {
      kidId,
      courseTitle,
      hoursStudied,
    },
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
