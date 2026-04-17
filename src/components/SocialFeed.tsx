import { useMemo, useState } from 'react'
import type { SocialPost, User } from '../types'

interface SocialFeedProps {
  users: User[]
  posts: SocialPost[]
  onCreatePost: (userId: number, content: string) => Promise<void>
  onToggleLike: (postId: number, userId: number) => Promise<void>
  onCreateComment: (postId: number, userId: number, content: string) => Promise<void>
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function SocialFeed({
  users,
  posts,
  onCreatePost,
  onToggleLike,
  onCreateComment,
}: SocialFeedProps) {
  const [posterUserId, setPosterUserId] = useState<number | ''>('')
  const [actorUserId, setActorUserId] = useState<number | ''>('')
  const [postContent, setPostContent] = useState('')
  const [commentByPost, setCommentByPost] = useState<Record<number, string>>({})
  const [isPosting, setIsPosting] = useState(false)
  const [pendingLikePostId, setPendingLikePostId] = useState<number | null>(null)
  const [pendingCommentPostId, setPendingCommentPostId] = useState<number | null>(null)

  const actorName = useMemo(
    () => users.find((user) => user.id === actorUserId)?.name ?? 'Chưa chọn',
    [actorUserId, users],
  )

  const handleCreatePost = async () => {
    const content = postContent.trim()
    if (!posterUserId || !content || isPosting) {
      return
    }

    setIsPosting(true)
    try {
      await onCreatePost(posterUserId, content)
      setPostContent('')
    } finally {
      setIsPosting(false)
    }
  }

  const handleToggleLike = async (postId: number) => {
    if (!actorUserId || pendingLikePostId) {
      return
    }

    setPendingLikePostId(postId)
    try {
      await onToggleLike(postId, actorUserId)
    } finally {
      setPendingLikePostId(null)
    }
  }

  const handleCreateComment = async (postId: number) => {
    if (!actorUserId || pendingCommentPostId) {
      return
    }

    const content = (commentByPost[postId] ?? '').trim()
    if (!content) {
      return
    }

    setPendingCommentPostId(postId)
    try {
      await onCreateComment(postId, actorUserId, content)
      setCommentByPost((current) => ({ ...current, [postId]: '' }))
    } finally {
      setPendingCommentPostId(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Bảng tin nội bộ</h2>
        <p className="mt-1 text-sm text-slate-500">
          Thành viên viết bài, mọi người vào thả thích và bình luận như một mini Facebook nội bộ.
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr]">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="social-poster">
              Người đăng bài
            </label>
            <select
              id="social-poster"
              value={posterUserId}
              onChange={(event) => setPosterUserId(event.target.value ? Number(event.target.value) : '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn thành viên --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="social-actor">
              Bạn đang tương tác với tư cách
            </label>
            <select
              id="social-actor"
              value={actorUserId}
              onChange={(event) => setActorUserId(event.target.value ? Number(event.target.value) : '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn thành viên --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          value={postContent}
          onChange={(event) => setPostContent(event.target.value)}
          rows={3}
          placeholder="Viết trạng thái của bạn..."
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={handleCreatePost}
          disabled={!posterUserId || !postContent.trim() || isPosting}
          className="mt-3 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPosting ? 'Đang đăng...' : 'Đăng bài'}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Bài viết gần đây</h3>
        <p className="mt-1 text-sm text-slate-500">Đang tương tác với tư cách: {actorName}</p>

        <div className="mt-4 space-y-4">
          {posts.map((post) => {
            const likedByActor =
              typeof actorUserId === 'number' && post.likes.some((like) => like.userId === actorUserId)

            return (
              <article key={post.id} className="rounded-lg border border-slate-200 p-4">
                <header className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{post.userName}</span>
                  <span className="text-slate-500">{formatDateTime(post.createdAt)}</span>
                </header>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    disabled={!actorUserId || pendingLikePostId === post.id}
                    className={`rounded px-3 py-1 font-medium ${
                      likedByActor
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    } disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500`}
                  >
                    {pendingLikePostId === post.id
                      ? 'Đang xử lý...'
                      : likedByActor
                        ? `Đã thích (${post.likes.length})`
                        : `Thích (${post.likes.length})`}
                  </button>
                  {post.likes.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {post.likes.map((like) => like.userName).join(', ')}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-medium text-slate-700">{comment.userName}</p>
                      <p className="text-slate-600">{comment.content}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(comment.createdAt)}</p>
                    </div>
                  ))}
                  {post.comments.length === 0 && (
                    <p className="text-sm text-slate-500">Chưa có bình luận nào.</p>
                  )}
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    value={commentByPost[post.id] ?? ''}
                    onChange={(event) =>
                      setCommentByPost((current) => ({
                        ...current,
                        [post.id]: event.target.value,
                      }))
                    }
                    placeholder="Viết bình luận..."
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => handleCreateComment(post.id)}
                    disabled={!actorUserId || !(commentByPost[post.id] ?? '').trim() || pendingCommentPostId === post.id}
                    className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {pendingCommentPostId === post.id ? 'Đang gửi...' : 'Bình luận'}
                  </button>
                </div>
              </article>
            )
          })}

          {posts.length === 0 && <p className="text-sm text-slate-500">Chưa có bài viết nào.</p>}
        </div>
      </section>
    </div>
  )
}

