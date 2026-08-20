import React, { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import "video-react/dist/video-react.css"
import { BigPlayButton, Player } from "video-react"
import { LuSparkles } from "react-icons/lu"

import { markLectureAsComplete } from "../../../services/operations/courseDetailsAPI"
import { generateVideoSummary } from "../../../services/operations/aiAPI"
import { updateCompletedLectures } from "../../../slices/viewCourseSlice"
import IconBtn from "../../Common/IconBtn"
import AISummaryPanel from "./AISummaryPanel"

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const playerRef = useRef(null)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { courseSectionData, courseEntireData, completedLectures } =
    useSelector((state) => state.viewCourse)

const [videoData, setVideoData] = useState(null)
    const [previewSource, setPreviewSource] = useState("")
  const [videoEnded, setVideoEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSummaryPanel, setShowSummaryPanel] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")
  const [summariesByLecture, setSummariesByLecture] = useState({})

  const currentSummary = summariesByLecture[subSectionId] || ""

  useEffect(() => {
  if (!courseSectionData?.length) return

  if (!courseId || !sectionId || !subSectionId) {
    navigate("/dashboard/enrolled-courses")
    return
  }

  const currentSection = courseSectionData.find(
    (course) => course._id === sectionId
  )

  if (!currentSection) {
    console.warn("Section not found:", sectionId)
    return
  }

  const currentVideo = currentSection.subSection?.find(
    (data) => data._id === subSectionId
  )

  if (!currentVideo) {
    console.warn("Sub-section not found:", subSectionId)
    return
  }

  setVideoData(currentVideo)
  setPreviewSource(courseEntireData?.thumbnail || "")
  setVideoEnded(false)
  setSummaryError("")
}, [
  courseSectionData,
  courseEntireData,
  location.pathname,
  courseId,
  sectionId,
  subSectionId,
  navigate,
])
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const handleGenerateSummary = async () => {
    if (!token || !courseId || !subSectionId) return

    setSummaryError("")
    setSummaryLoading(true)

    try {
      const summary = await generateVideoSummary(courseId, subSectionId, token)
      setSummariesByLecture((current) => ({ ...current, [subSectionId]: summary }))
    } catch (error) {
      setSummaryError(error.message)
    } finally {
      setSummaryLoading(false)
    }
  }

  const isFirstVideo = () => {
  if (!courseSectionData?.length) return true

  const currentSectionIndx = courseSectionData.findIndex(
    (data) => data._id === sectionId
  )

  if (currentSectionIndx < 0) return true

  const currentSubSectionIndx =
    courseSectionData[currentSectionIndx]?.subSection?.findIndex(
      (data) => data._id === subSectionId
    )

  if (currentSubSectionIndx < 0) return true

  return currentSectionIndx === 0 && currentSubSectionIndx === 0
}

  const goToNextVideo = () => {
  if (!courseSectionData?.length) return

  const currentSectionIndx = courseSectionData.findIndex(
    (data) => data._id === sectionId
  )

  if (currentSectionIndx < 0) return

  const currentSection = courseSectionData[currentSectionIndx]

  const currentSubSectionIndx =
    currentSection?.subSection?.findIndex(
      (data) => data._id === subSectionId
    )

  if (currentSubSectionIndx < 0) return

  // Next lecture in the same section
  if (
    currentSubSectionIndx <
    currentSection.subSection.length - 1
  ) {
    const nextSubSectionId =
      currentSection.subSection[currentSubSectionIndx + 1]?._id

    if (!nextSubSectionId) return

    navigate(
      `/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`
    )

    return
  }

  // Next section
  const nextSection = courseSectionData[currentSectionIndx + 1]

  if (!nextSection?.subSection?.length) return

  const nextSectionId = nextSection._id
  const nextSubSectionId = nextSection.subSection[0]?._id

  if (!nextSectionId || !nextSubSectionId) return

  navigate(
    `/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`
  )
}
  const isLastVideo = () => {
  if (!courseSectionData?.length) return true

  const currentSectionIndx = courseSectionData.findIndex(
    (data) => data._id === sectionId
  )

  if (currentSectionIndx < 0) return true

  const currentSection = courseSectionData[currentSectionIndx]

  const currentSubSectionIndx =
    currentSection?.subSection?.findIndex(
      (data) => data._id === subSectionId
    )

  if (currentSubSectionIndx < 0) return true

  return (
    currentSectionIndx === courseSectionData.length - 1 &&
    currentSubSectionIndx === currentSection.subSection.length - 1
  )
}

const goToPrevVideo = () => {
  if (!courseSectionData?.length) return

  const currentSectionIndx = courseSectionData.findIndex(
    (data) => data._id === sectionId
  )

  if (currentSectionIndx < 0) return

  const currentSection = courseSectionData[currentSectionIndx]

  const currentSubSectionIndx =
    currentSection?.subSection?.findIndex(
      (data) => data._id === subSectionId
    )

  if (currentSubSectionIndx < 0) return

  // Previous lecture in same section
  if (currentSubSectionIndx > 0) {
    const prevSubSectionId =
      currentSection.subSection[currentSubSectionIndx - 1]?._id

    if (!prevSubSectionId) return

    navigate(
      `/view-course/${courseId}/section/${sectionId}/sub-section/${prevSubSectionId}`
    )

    return
  }

  // Previous section
  const previousSection =
    courseSectionData[currentSectionIndx - 1]

  if (!previousSection?.subSection?.length) return

  const prevSectionId = previousSection._id

  const prevSubSectionId =
    previousSection.subSection[
      previousSection.subSection.length - 1
    ]?._id

  if (!prevSectionId || !prevSubSectionId) return

  navigate(
    `/view-course/${courseId}/section/${prevSectionId}/sub-section/${prevSubSectionId}`
  )
}

  const handleLectureCompletion = async () => {
    setLoading(true)
    const res = await markLectureAsComplete(
      { courseId: courseId, subsectionId: subSectionId },
      token
    )
    if (res) {
      dispatch(updateCompletedLectures(subSectionId))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-5 pb-8 text-white">
      {!isFullscreen && !showSummaryPanel && (
        <button
          type="button"
          onClick={() => setShowSummaryPanel(true)}
          className="ml-auto flex items-center gap-2 rounded-md border border-richblack-600 bg-richblack-800 px-3 py-2 text-sm font-semibold text-richblack-5 transition hover:border-yellow-50 hover:text-yellow-50"
        >
          <LuSparkles size={16} />
          AI Summary
        </button>
      )}

      <div
        className={
          isFullscreen || !showSummaryPanel
            ? "grid grid-cols-1"
            : "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        }
      >
        <section className="min-w-0">
          {!videoData ? (
            <img
              src={previewSource}
              alt="Preview"
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <div className="rounded-lg bg-black">
              <Player
                ref={playerRef}
                aspectRatio="16:9"
                playsInline
                onEnded={() => setVideoEnded(true)}
                src={videoData?.videoUrl}
              >
                <BigPlayButton position="center" />
                {videoEnded && (
                  <div
                    style={{
                      backgroundImage:
                        "linear-gradient(to top, rgb(0, 0, 0), rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.1)",
                    }}
                    className="full absolute inset-0 z-[100] grid h-full place-content-center font-inter"
                  >
                    {!completedLectures.includes(subSectionId) && (
                      <IconBtn
                        disabled={loading}
                        onclick={() => handleLectureCompletion()}
                        text={!loading ? "Mark As Completed" : "Loading..."}
                        customClasses="text-xl max-w-max px-4 mx-auto"
                      />
                    )}
                    <IconBtn
                      disabled={loading}
                      onclick={() => {
                        if (playerRef?.current) {
                          playerRef?.current?.seek(0)
                          setVideoEnded(false)
                        }
                      }}
                      text="Rewatch"
                      customClasses="text-xl max-w-max px-4 mx-auto mt-2"
                    />
                    <div className="mt-10 flex min-w-[250px] justify-center gap-x-4 text-xl">
                      {!isFirstVideo() && (
                        <button
                          disabled={loading}
                          onClick={goToPrevVideo}
                          className="blackButton"
                        >
                          Prev
                        </button>
                      )}
                      {!isLastVideo() && (
                        <button
                          disabled={loading}
                          onClick={goToNextVideo}
                          className="blackButton"
                        >
                          Next
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Player>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mt-4 text-3xl font-semibold">{videoData?.title}</h1>
              <p className="pt-2 pb-6 text-richblack-200">{videoData?.description}</p>
            </div>
            {!isFullscreen && showSummaryPanel && !currentSummary && (
              <button
                type="button"
                onClick={() => setShowSummaryPanel(true)}
                className="mt-4 hidden shrink-0 items-center gap-2 rounded-md border border-richblack-600 px-3 py-2 text-sm font-semibold text-richblack-5 hover:border-yellow-50 hover:text-yellow-50 sm:flex"
              >
                <LuSparkles size={16} />
                AI Summary
              </button>
            )}
          </div>
        </section>

        {!isFullscreen && showSummaryPanel && (
          <AISummaryPanel
            summary={currentSummary}
            loading={summaryLoading}
            error={summaryError}
            onGenerate={handleGenerateSummary}
            onClose={() => setShowSummaryPanel(false)}
          />
        )}
      </div>
    </div>
  )
}

export default VideoDetails
