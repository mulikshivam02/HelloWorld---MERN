const fs = require("node:fs")
const fsPromises = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { pipeline } = require("node:stream/promises")
const { GoogleGenAI, createUserContent, createPartFromUri } = require("@google/genai")
const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
const MAX_PROCESSING_POLLS = 60
const POLL_INTERVAL_MS = 5000

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server")
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getSafeExtension(videoUrl, contentType) {
  const mimeExtensionMap = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-matroska": ".mkv",
  }

  if (mimeExtensionMap[contentType]) return mimeExtensionMap[contentType]

  try {
    const extension = path.extname(new URL(videoUrl).pathname)
    return extension || ".mp4"
  } catch {
    return ".mp4"
  }
}

async function downloadVideo(videoUrl) {
  const parsedUrl = new URL(videoUrl)
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Unsupported video URL protocol")
  }

  const response = await fetch(videoUrl)
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download video (${response.status})`)
  }

  const contentType = (response.headers.get("content-type") || "video/mp4")
    .split(";")[0]
    .trim()
  const contentLength = Number(response.headers.get("content-length") || 0)

  if (contentLength > MAX_VIDEO_BYTES) {
    throw new Error("Video is too large. The maximum supported size is 2 GB.")
  }

  const tempDir = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "helloworld-ai-")
  )
  const filePath = path.join(
    tempDir,
    `lecture${getSafeExtension(videoUrl, contentType)}`
  )

  try {
    await pipeline(ReadableFromWeb(response.body), fs.createWriteStream(filePath))
  } catch (error) {
    await fsPromises.rm(tempDir, { recursive: true, force: true })
    throw error
  }

  const stats = await fsPromises.stat(filePath)
  if (stats.size > MAX_VIDEO_BYTES) {
    await fsPromises.rm(tempDir, { recursive: true, force: true })
    throw new Error("Video is too large. The maximum supported size is 2 GB.")
  }

  return { filePath, tempDir, contentType }
}

function ReadableFromWeb(body) {
  // Node 18+ exposes Readable.fromWeb. The current HelloWorld setup uses Node 24.
  return require("node:stream").Readable.fromWeb(body)
}

async function waitForGeminiFile(ai, file) {
  let currentFile = file

  for (let poll = 0; poll < MAX_PROCESSING_POLLS; poll += 1) {
    const state = currentFile.state?.toString?.() || String(currentFile.state || "")

    if (state === "ACTIVE") return currentFile
    if (state === "FAILED") {
      throw new Error("Gemini could not process the video file")
    }

    await sleep(POLL_INTERVAL_MS)
    currentFile = await ai.files.get({ name: currentFile.name })
  }

  throw new Error("Gemini video processing timed out")
}

exports.summarizeVideo = async (req, res) => {
  try {
    const { courseId, subSectionId } = req.body
    const userId = req.user.id

    if (!courseId || !subSectionId) {
      return res.status(400).json({
        success: false,
        message: "courseId and subSectionId are required",
      })
    }

    const [course, subSection] = await Promise.all([
      Course.findById(courseId).select("courseName studentsEnroled courseContent"),
      SubSection.findById(subSectionId).select("title description videoUrl"),
    ])

    if (!course || !subSection) {
      return res.status(404).json({
        success: false,
        message: "Course or lecture not found",
      })
    }

    const isEnrolled = course.studentsEnroled.some(
      (studentId) => studentId.toString() === userId.toString()
    )

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      })
    }

    const section = await Section.findOne({
      _id: { $in: course.courseContent },
      subSection: subSectionId,
    }).select("_id")

    if (!section || !subSection.videoUrl) {
      return res.status(404).json({
        success: false,
        message: "Lecture video not found for this course",
      })
    }

    const ai = getGeminiClient()
    const { filePath, tempDir, contentType } = await downloadVideo(
      subSection.videoUrl
    )

    let uploadedFile = null

    try {
      uploadedFile = await ai.files.upload({
        file: filePath,
        config: { mimeType: contentType },
      })

      uploadedFile = await waitForGeminiFile(ai, uploadedFile)

const prompt = `
You are an expert educational video analyst and tutor.

Analyze the ATTACHED VIDEO carefully. The actual video content is the primary source of truth.

The goal is to create a detailed, student-friendly study note based on what is actually explained, shown, demonstrated, or discussed in the video.

IMPORTANT:
- Analyze the actual spoken audio, slides, text, diagrams, code, examples, and demonstrations in the video.
- Do NOT create the answer mainly from the lecture title or description.
- The lecture title and description are only metadata to identify the lecture.
- Do NOT invent topics that are not present in the video.
- You may provide a definition or additional clarification of a concept when it is relevant to something actually discussed in the video.
- Keep the explanation connected to the video.

For every important technical term, concept, technology, method, algorithm, command, formula, or terminology introduced in the video:
1. Give a simple definition.
2. Explain how it is being used or discussed in the video.
3. Give the relevant example from the video, if available.
4. Add a small clarification/example from general knowledge ONLY when it helps the student understand the concept better.

The additional definitions and explanations must support the video's content, not replace it.

Use simple and clear language suitable for a university student who is learning the topic for the first time.

Lecture metadata:
Course: ${course.courseName}
Lecture title: ${subSection.title}
Lecture description: ${subSection.description || "Not provided"}

Create the study note using the following structure:

## 1. Overview

Give a clear 2-5 sentence overview of what the instructor teaches in the video.

## 2. Concepts Covered

List the major concepts actually covered in the video.

For each important concept use this format:

### Concept Name

**Definition:**  
Give a simple and accurate definition.

**Explanation:**  
Explain how the concept is explained or used in this video.

**Example:**  
Give the example, code, scenario, diagram, or demonstration shown in the video when available.

**In Simple Words:**  
Give a short, easy-to-understand explanation.

## 3. Detailed Explanation

Explain the video's content in a logical order, following the flow of the lecture.

For each topic:
- Explain what the instructor teaches.
- Define important terms when they first appear.
- Explain relationships between concepts.
- Explain examples and demonstrations.
- Explain code or commands when shown.
- Explain diagrams or visual content when relevant.

Do not simply list the topics. Teach the material as if you are helping a student understand the lecture after watching it.

## 4. Important Definitions

Create a concise reference list of important terms from the video.

Use:

**Term:** Definition

Only include terms that are relevant to concepts actually discussed in the video.

## 5. Examples and Demonstrations

Describe the important examples, practical demonstrations, problems, code, commands, or scenarios shown in the video.

For code or commands:
- Explain what they do.
- Explain the important parts.
- Explain the expected result when it is clear from the video.

## 6. Key Points

List the most important points a student should remember from the video.

## 7. Common Confusions

Identify concepts from the video that students may commonly confuse.

Explain the difference clearly.

Only include relevant comparisons.

## 8. Practical Understanding

Explain where the concepts taught in the video can be used in real-world applications.

Keep this section connected to the concepts actually covered.

## 9. Final Takeaways

Give 5-8 concise points summarizing the most important things learned from the video.

## 10. Useful Timestamps

Provide important timestamps when they can be reliably identified from the video.

Use:

- **MM:SS — Topic:** Short explanation of what is discussed.

Do not invent timestamps.

CRITICAL RULES:

1. The VIDEO itself is the primary source.
2. Do not summarize based only on the title or description.
3. Do not invent topics, examples, code, definitions, or explanations that contradict the video.
4. Definitions may use general knowledge to make concepts easier to understand, but they must correspond to concepts actually present in the video.
5. If the instructor briefly mentions a technical term without explaining it, provide a concise definition so the student can understand it.
6. If the instructor explains a concept in detail, preserve that explanation and enhance it with a clearer definition where useful.
7. If the video contains code, commands, formulas, diagrams, or demonstrations, explain them rather than merely mentioning them.
8. If something cannot be clearly understood from the video, explicitly say that it could not be reliably determined.
9. Do not make the output excessively repetitive.
10. The final result should function as useful study notes that a student can revise without rewatching the entire video.

Return only the markdown study notes.
`;
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: createUserContent([
          createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
          prompt,
        ]),
      })

      return res.status(200).json({
        success: true,
        data: {
          summary: response.text || "No summary was generated.",
          model: GEMINI_MODEL,
        },
      })
    } finally {
      try {
        if (uploadedFile?.name) {
          await ai.files.delete({ name: uploadedFile.name })
        }
      } catch (cleanupError) {
        console.log("GEMINI FILE CLEANUP ERROR:", cleanupError.message)
      }

      await fsPromises.rm(tempDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error("AI VIDEO SUMMARY ERROR:", error)

    const message =
      error?.message || "Unable to generate an AI summary for this video"

    return res.status(500).json({
      success: false,
      message,
    })
  }
}
