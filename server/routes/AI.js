const express = require("express");
const router = express.Router();

const { summarizeVideo } = require("../controllers/AI");
const { auth, isStudent } = require("../middleware/auth");

router.post(
    "/summarize-video",
    auth,
    isStudent,
    summarizeVideo
);

module.exports = router;
