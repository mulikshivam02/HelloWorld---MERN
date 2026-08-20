import ReactMarkdown from "react-markdown"
import { AiOutlineClose } from "react-icons/ai"
import { LuSparkles } from "react-icons/lu"
import { FiRefreshCw } from "react-icons/fi"

const markdownComponents = {
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-base font-bold text-richblack-5 first:mt-0">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-6 text-richblack-100">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-6 text-richblack-100">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-richblack-100">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-richblack-5">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-richblack-700 px-1 py-0.5 text-xs text-yellow-50">
      {children}
    </code>
  ),
}

export default function AISummaryPanel({
  summary,
  loading,
  error,
  onGenerate,
  onClose,
}) {
  return (
    <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-richblack-700 bg-richblack-800 shadow-lg">
      <div className="flex items-center justify-between border-b border-richblack-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50 text-richblack-900">
            <LuSparkles size={17} />
          </div>
          <div>
            <h2 className="font-semibold text-richblack-5">AI Video Summary</h2>
            <p className="text-xs text-richblack-300">Powered by Gemini</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close AI summary"
          onClick={onClose}
          className="rounded-md p-2 text-richblack-200 transition hover:bg-richblack-700 hover:text-richblack-5"
        >
          <AiOutlineClose size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!summary && !loading && !error && (
          <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
            <LuSparkles size={34} className="mb-4 text-yellow-50" />
            <h3 className="text-lg font-semibold text-richblack-5">
              Understand this lecture faster
            </h3>
            <p className="mt-2 max-w-[280px] text-sm leading-6 text-richblack-200">
              Generate a clear summary, key points, important concepts and
              takeaways from the current video.
            </p>
            <button
              type="button"
              onClick={onGenerate}
              className="mt-6 flex items-center gap-2 rounded-md bg-yellow-50 px-4 py-2 font-semibold text-richblack-900 transition hover:scale-[0.98]"
            >
              <LuSparkles size={16} />
              Generate Summary
            </button>
          </div>
        )}

        {loading && (
          <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-richblack-600 border-t-yellow-50" />
            <h3 className="mt-5 font-semibold text-richblack-5">
              Analyzing the lecture...
            </h3>
            <p className="mt-2 max-w-[280px] text-sm leading-6 text-richblack-300">
              The video is being processed and summarized. Longer videos can
              take a little more time.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md border border-pink-500/30 bg-pink-900/20 p-4">
            <p className="text-sm leading-6 text-pink-100">{error}</p>
            <button
              type="button"
              onClick={onGenerate}
              className="mt-4 flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-sm font-semibold text-richblack-900"
            >
              <FiRefreshCw size={15} />
              Try Again
            </button>
          </div>
        )}

        {summary && !loading && (
          <div>
            <ReactMarkdown components={markdownComponents}>{summary}</ReactMarkdown>
            <button
              type="button"
              onClick={onGenerate}
              className="mt-4 flex items-center gap-2 rounded-md border border-richblack-600 px-3 py-2 text-xs font-semibold text-richblack-5 hover:border-yellow-50 hover:text-yellow-50"
            >
              <FiRefreshCw size={14} />
              Regenerate
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
