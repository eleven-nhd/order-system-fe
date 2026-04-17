import { useMemo, useState } from 'react'
import type { MemberPhoto, User } from '../types'

interface FunGalleryProps {
  users: User[]
  photos: MemberPhoto[]
  onUpload: (userId: number, file: File) => Promise<void>
  onDelete: (photoId: number, filePath: string) => Promise<void>
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function FunGallery({ users, photos, onUpload, onDelete }: FunGalleryProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null)

  const groupedPhotos = useMemo(() => {
    const grouped = new Map<string, MemberPhoto[]>()

    for (const photo of photos) {
      const key = `${photo.userId}:${photo.userName}`
      const group = grouped.get(key) ?? []
      group.push(photo)
      grouped.set(key, group)
    }

    return Array.from(grouped.entries())
      .map(([key, group]) => {
        const [userIdRaw, ...nameParts] = key.split(':')
        return {
          userId: Number(userIdRaw),
          userName: nameParts.join(':') || `User #${userIdRaw}`,
          photos: group,
        }
      })
      .sort((a, b) => a.userName.localeCompare(b.userName, 'vi'))
  }, [photos])

  const handleUpload = async () => {
    if (!selectedUserId || !selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      return
    }

    setIsUploading(true)
    try {
      await onUpload(selectedUserId, selectedFile)
      setSelectedFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePhoto = async (photo: MemberPhoto) => {
    if (deletingPhotoId) {
      return
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa ảnh của ${photo.userName}?`)
    if (!confirmed) {
      return
    }

    setDeletingPhotoId(photo.id)
    try {
      await onDelete(photo.id, photo.filePath)
    } finally {
      setDeletingPhotoId(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Gu của các cán bộ</h2>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi thành viên có thể upload ảnh để tạo bộ sưu tập cá nhân. Mọi người đều xem được.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={selectedUserId}
            onChange={(event) => {
              const next = event.target.value
              setSelectedUserId(next ? Number(next) : '')
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Chọn thành viên upload ảnh</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setSelectedFile(file)
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedUserId || !selectedFile || isUploading}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isUploading ? 'Đang upload...' : 'Upload ảnh'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Bộ sưu tập gu theo thành viên</h3>

        {groupedPhotos.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Chưa có ảnh nào được upload.</p>
        )}

        <div className="mt-4 space-y-6">
          {groupedPhotos.map((group) => (
            <article key={group.userId} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">{group.userName}</h4>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {group.photos.map((photo) => (
                  <figure
                    key={photo.id}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={photo.imageUrl}
                      alt={`Anh cua ${photo.userName}`}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                    <figcaption className="px-2 py-1 text-xs text-slate-500">
                      <div className="flex items-center justify-between gap-2">
                        <span>{formatDateTime(photo.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={deletingPhotoId === photo.id}
                          className="rounded bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          {deletingPhotoId === photo.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

