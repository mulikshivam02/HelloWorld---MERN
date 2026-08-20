import { toast } from "react-hot-toast"

import { apiConnector } from "../apiConnector"
import { aiEndpoints } from "../apis"

const { AI_SUMMARY_API } = aiEndpoints

export async function generateVideoSummary(courseId, subSectionId, token) {
  const toastId = toast.loading("Preparing AI video summary...")

  try {
    const response = await apiConnector(
      "POST",
      AI_SUMMARY_API,
      { courseId, subSectionId },
      { Authorization: `Bearer ${token}` }
    )

    if (!response?.data?.success) {
      throw new Error(
        response?.data?.message || "Could not generate the video summary"
      )
    }

    return response.data.data.summary
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Could not generate the video summary"

    console.error("AI VIDEO SUMMARY API ERROR:", error)
    toast.error(message)
    throw new Error(message)
  } finally {
    toast.dismiss(toastId)
  }
}
