import { supabase } from './supabase'
import type {
  DateRange,
  DrinkVote,
  MemberPhoto,
  MenuItem,
  MenuItemType,
  OrderRecord,
  SocialPost,
  User,
  VoteSession,
} from '../types'

interface SupabaseErrorLike {
  message: string
}

interface SupabaseOrderDetailRow {
  id: number
  user_id: number
  item_id: number
  quantity: number | null
  price_at_time: number | null
  user: { id: number; name: string } | null
  item: { id: number; name: string } | null
}

interface SupabaseOrderRow {
  id: number
  buyer_id: number
  order_date: string
  total_amount: number
  buyer: { id: number; name: string } | null
  details: SupabaseOrderDetailRow[] | null
}

interface SupabaseMemberPhotoRow {
  id: number
  user_id: number
  file_path: string
  created_at: string
  user: { id: number; name: string } | null
}

interface SupabaseDrinkVoteRow {
  id: number
  session_id: number
  user_id: number
  item_id: number
  quantity: number
  created_at: string
  user: { id: number; name: string } | null
  item: { id: number; name: string } | null
}

interface SupabaseVoteSessionRow {
  id: number
  code: string
  created_at: string
}

interface SupabaseSocialLikeRow {
  id: number
  user_id: number
  created_at: string
  user: { id: number; name: string } | null
}

interface SupabaseSocialCommentRow {
  id: number
  user_id: number
  content: string
  created_at: string
  user: { id: number; name: string } | null
}

interface SupabaseSocialPostRow {
  id: number
  user_id: number
  content: string
  created_at: string
  author: { id: number; name: string } | null
  likes: SupabaseSocialLikeRow[] | null
  comments: SupabaseSocialCommentRow[] | null
}

type RelationValue<T> = T | T[] | null

const MEMBER_PHOTOS_BUCKET = 'member-photos'

export interface NewOrderLine {
  userId: number
  itemId: number
  quantity: number
}

function throwIfError(error: SupabaseErrorLike | null, fallbackMessage: string): void {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

function unwrapRelation<T>(value: RelationValue<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

function toVoteSession(row: SupabaseVoteSessionRow): VoteSession {
  return {
    id: row.id,
    code: row.code,
    createdAt: row.created_at,
  }
}

function makeVoteSessionCode(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const random = Math.floor(Math.random() * 900 + 100)
  return `VOTE-${year}${month}${day}-${hour}${minute}-${random}`
}

async function createVoteSession(): Promise<VoteSession> {
  const { data, error } = await supabase
    .from('vote_sessions')
    .insert({ code: makeVoteSessionCode() })
    .select('id, code, created_at')
    .single()

  throwIfError(error, 'Không thể tạo phiên vote mới.')

  if (!data) {
    throw new Error('Không thể tạo phiên vote mới.')
  }

  return toVoteSession(data as SupabaseVoteSessionRow)
}

export async function getOrCreateActiveVoteSession(): Promise<VoteSession> {
  const { data, error } = await supabase
    .from('vote_sessions')
    .select('id, code, created_at')
    .is('closed_at', null)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  throwIfError(error, 'Không thể tải phiên vote hiện tại.')

  if (data) {
    return toVoteSession(data as SupabaseVoteSessionRow)
  }

  return createVoteSession()
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .order('name', { ascending: true })

  throwIfError(error, 'Không thể tải danh sách thành viên.')
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }))
}

export async function createUser(name: string): Promise<void> {
  const { error } = await supabase.from('users').insert({ name: name.trim() })
  throwIfError(error, 'Không thể tạo thành viên.')
}

export async function updateUser(id: number, name: string): Promise<void> {
  const { error } = await supabase.from('users').update({ name: name.trim() }).eq('id', id)
  throwIfError(error, 'Không thể cập nhật thành viên.')
}

export async function deleteUser(id: number): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', id)
  throwIfError(error, 'Không thể xóa thành viên.')
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menuitems')
    .select('id, name, price, type')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  throwIfError(error, 'Không thể tải menu.')

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    type: (row.type ?? 'food') as MenuItemType,
  }))
}

export async function createMenuItem(
  name: string,
  price: number,
  type: MenuItemType,
): Promise<void> {
  const { error } = await supabase.from('menuitems').insert({
    name: name.trim(),
    price,
    type,
  })
  throwIfError(error, 'Không thể thêm món mới.')
}

export async function updateMenuItem(
  id: number,
  name: string,
  price: number,
  type: MenuItemType,
): Promise<void> {
  const { error } = await supabase
    .from('menuitems')
    .update({ name: name.trim(), price, type })
    .eq('id', id)

  throwIfError(error, 'Không thể cập nhật món ăn.')
}

export async function deleteMenuItem(id: number): Promise<void> {
  const { error } = await supabase.from('menuitems').delete().eq('id', id)
  throwIfError(error, 'Không thể xóa món ăn.')
}

export async function getSocialPosts(): Promise<SocialPost[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select(
      `
      id,
      user_id,
      content,
      created_at,
      author:users!social_posts_user_id_fkey (id, name),
      likes:post_likes (
        id,
        user_id,
        created_at,
        user:users!post_likes_user_id_fkey (id, name)
      ),
      comments:post_comments (
        id,
        user_id,
        content,
        created_at,
        user:users!post_comments_user_id_fkey (id, name)
      )
      `,
    )
    .order('created_at', { ascending: false })

  throwIfError(error, 'Không thể tải bảng tin trạng thái.')

  const rows = (data ?? []) as unknown as Array<
    Omit<SupabaseSocialPostRow, 'author' | 'likes' | 'comments'> & {
      author: RelationValue<{ id: number; name: string }>
      likes:
        | Array<
            Omit<SupabaseSocialLikeRow, 'user'> & {
              user: RelationValue<{ id: number; name: string }>
            }
          >
        | null
      comments:
        | Array<
            Omit<SupabaseSocialCommentRow, 'user'> & {
              user: RelationValue<{ id: number; name: string }>
            }
          >
        | null
    }
  >

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: unwrapRelation(row.author)?.name ?? `User #${row.user_id}`,
    content: row.content,
    createdAt: row.created_at,
    likes: (row.likes ?? [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((like) => ({
        id: like.id,
        userId: like.user_id,
        userName: unwrapRelation(like.user)?.name ?? `User #${like.user_id}`,
        createdAt: like.created_at,
      })),
    comments: (row.comments ?? [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((comment) => ({
        id: comment.id,
        userId: comment.user_id,
        userName: unwrapRelation(comment.user)?.name ?? `User #${comment.user_id}`,
        content: comment.content,
        createdAt: comment.created_at,
      })),
  }))
}

export async function createSocialPost(userId: number, content: string): Promise<void> {
  const text = content.trim()
  if (!text) {
    throw new Error('Nội dung bài viết không được để trống.')
  }

  const { error } = await supabase.from('social_posts').insert({
    user_id: userId,
    content: text,
  })

  throwIfError(error, 'Không thể đăng bài viết mới.')
}

export async function togglePostLike(postId: number, userId: number): Promise<void> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  throwIfError(error, 'Không thể kiểm tra trạng thái thích bài viết.')

  if (data?.id) {
    const { error: deleteError } = await supabase.from('post_likes').delete().eq('id', data.id)
    throwIfError(deleteError, 'Không thể bỏ thích bài viết.')
    return
  }

  const { error: insertError } = await supabase.from('post_likes').insert({
    post_id: postId,
    user_id: userId,
  })

  throwIfError(insertError, 'Không thể thích bài viết.')
}

export async function createPostComment(postId: number, userId: number, content: string): Promise<void> {
  const text = content.trim()
  if (!text) {
    throw new Error('Nội dung bình luận không được để trống.')
  }

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: userId,
    content: text,
  })

  throwIfError(error, 'Không thể gửi bình luận.')
}

export async function createOrder(buyerId: number, lines: NewOrderLine[]): Promise<number> {
  if (lines.length === 0) {
    throw new Error('Bạn phải thêm ít nhất 1 món.')
  }

  const itemIds = Array.from(new Set(lines.map((line) => line.itemId)))
  const { data: menuRows, error: menuError } = await supabase
    .from('menuitems')
    .select('id, price')
    .in('id', itemIds)

  throwIfError(menuError, 'Không thể đọc thông tin menu.')

  if ((menuRows ?? []).length !== itemIds.length) {
    throw new Error('Một số món ăn không còn tồn tại trong menu.')
  }

  const priceMap = new Map((menuRows ?? []).map((row) => [row.id, Number(row.price)]))
  const normalizedLines = lines.map((line) => {
    const price = priceMap.get(line.itemId)
    if (price === undefined) {
      throw new Error('Không tìm thấy giá món ăn.')
    }

    return {
      ...line,
      quantity: Math.max(1, line.quantity),
      price,
      lineTotal: Math.max(1, line.quantity) * price,
    }
  })

  const totalAmount = normalizedLines.reduce((sum, line) => sum + line.lineTotal, 0)

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({ buyer_id: buyerId, total_amount: totalAmount })
    .select('id')
    .single()

  throwIfError(orderError, 'Không thể tạo order.')

  if (!orderRow) {
    throw new Error('Không thể tạo order.')
  }

  const { error: detailError } = await supabase.from('orderdetails').insert(
    normalizedLines.map((line) => ({
      order_id: orderRow.id,
      user_id: line.userId,
      item_id: line.itemId,
      quantity: line.quantity,
      price_at_time: line.price,
    })),
  )

  if (detailError) {
    // Supabase client cannot wrap multi-table inserts in a DB transaction by default.
    await supabase.from('orders').delete().eq('id', orderRow.id)
    throw new Error(detailError.message || 'Không thể lưu chi tiết order.')
  }

  return orderRow.id
}

export async function deleteOrdersByDateRange(range: DateRange): Promise<number> {
  let deleteBuilder = supabase.from('orders').delete().select('id')

  if (range.start) {
    deleteBuilder = deleteBuilder.gte('order_date', range.start)
  }

  if (range.end) {
    deleteBuilder = deleteBuilder.lt('order_date', range.end)
  }

  const { data, error } = await deleteBuilder
  throwIfError(error, 'Không thể xóa hóa đơn theo bộ lọc thời gian.')

  return data?.length ?? 0
}

export async function uploadMemberPhoto(userId: number, file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', contentType: file.type || undefined })

  throwIfError(uploadError, 'Không thể upload ảnh lên Supabase Storage.')

  const { error: insertError } = await supabase
    .from('member_photos')
    .insert({ user_id: userId, file_path: filePath })

  if (insertError) {
    await supabase.storage.from(MEMBER_PHOTOS_BUCKET).remove([filePath])
    throw new Error(insertError.message || 'Không thể lưu metadata ảnh.')
  }
}

export async function getMemberPhotos(): Promise<MemberPhoto[]> {
  const { data, error } = await supabase
    .from('member_photos')
    .select(
      `
      id,
      user_id,
      file_path,
      created_at,
      user:users!member_photos_user_id_fkey (id, name)
      `,
    )
    .order('created_at', { ascending: false })

  throwIfError(error, 'Không thể tải bộ sưu tập ảnh.')

  const rows = (data ?? []) as unknown as Array<
    Omit<SupabaseMemberPhotoRow, 'user'> & {
      user: RelationValue<{ id: number; name: string }>
    }
  >

  return rows.map((row) => {
    const { data: publicUrlData } = supabase.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .getPublicUrl(row.file_path)

    return {
      id: row.id,
      userId: row.user_id,
      userName: unwrapRelation(row.user)?.name ?? `User #${row.user_id}`,
      filePath: row.file_path,
      imageUrl: publicUrlData.publicUrl,
      createdAt: row.created_at,
    }
  })
}

export async function getPendingDrinkVotes(sessionId: number): Promise<DrinkVote[]> {
  const { data, error } = await supabase
    .from('drink_votes')
    .select(
      `
      id,
      session_id,
      user_id,
      item_id,
      quantity,
      created_at,
      user:users!drink_votes_user_id_fkey (id, name),
      item:menuitems!drink_votes_item_id_fkey (id, name)
      `,
    )
    .eq('session_id', sessionId)
    .is('order_id', null)
    .order('created_at', { ascending: true })

  throwIfError(error, 'Không thể tải danh sách vote đồ uống.')

  const rows = (data ?? []) as unknown as Array<
    Omit<SupabaseDrinkVoteRow, 'user' | 'item'> & {
      user: RelationValue<{ id: number; name: string }>
      item: RelationValue<{ id: number; name: string }>
    }
  >

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    userName: unwrapRelation(row.user)?.name ?? `User #${row.user_id}`,
    itemId: row.item_id,
    itemName: unwrapRelation(row.item)?.name ?? `Item #${row.item_id}`,
    quantity: Math.max(1, row.quantity ?? 1),
    createdAt: row.created_at,
  }))
}

export async function submitDrinkVote(
  sessionId: number,
  userId: number,
  itemId: number,
  quantity: number,
): Promise<void> {
  const normalizedQuantity = Math.max(1, Math.floor(quantity))

  const { error: deleteError } = await supabase
    .from('drink_votes')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .is('order_id', null)

  throwIfError(deleteError, 'Không thể cập nhật vote cũ.')

  const { error: insertError } = await supabase.from('drink_votes').insert({
    session_id: sessionId,
    user_id: userId,
    item_id: itemId,
    quantity: normalizedQuantity,
  })

  throwIfError(insertError, 'Không thể gửi vote đồ uống.')
}

export async function cancelDrinkVote(sessionId: number, userId: number): Promise<void> {
  const { error } = await supabase
    .from('drink_votes')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .is('order_id', null)

  throwIfError(error, 'Không thể hủy vote của bạn.')
}

export async function checkoutPendingDrinkVotes(sessionId: number, buyerId: number): Promise<VoteSession> {
  const { data: pendingRows, error: pendingError } = await supabase
    .from('drink_votes')
    .select('id, user_id, item_id, quantity')
    .eq('session_id', sessionId)
    .is('order_id', null)

  throwIfError(pendingError, 'Không thể tải vote để chốt đơn.')

  if (!pendingRows || pendingRows.length === 0) {
    throw new Error('Chưa có vote nào để chốt hóa đơn chung.')
  }

  const orderId = await createOrder(
    buyerId,
    pendingRows.map((row) => ({
      userId: row.user_id,
      itemId: row.item_id,
      quantity: Math.max(1, row.quantity ?? 1),
    })),
  )

  const voteIds = pendingRows.map((row) => row.id)
  const { error: finalizeError } = await supabase
    .from('drink_votes')
    .update({ order_id: orderId })
    .in('id', voteIds)

  if (finalizeError) {
    throw new Error(finalizeError.message || 'Đã tạo hóa đơn nhưng không đóng vote.')
  }

  const { error: closeError } = await supabase
    .from('vote_sessions')
    .update({ closed_at: new Date().toISOString(), closed_order_id: orderId })
    .eq('id', sessionId)

  throwIfError(closeError, 'Đã chốt đơn nhưng không đóng được phiên vote.')

  return createVoteSession()
}

export async function deleteMemberPhoto(photoId: number, filePath: string): Promise<void> {
  const { error: deleteRowError } = await supabase.from('member_photos').delete().eq('id', photoId)
  throwIfError(deleteRowError, 'Không thể xóa metadata ảnh.')

  const { error: removeFileError } = await supabase.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .remove([filePath])

  if (removeFileError) {
    // Metadata is already deleted; report storage cleanup failure so admins can investigate.
    throw new Error(removeFileError.message || 'Đã xóa metadata nhưng không xóa được file ảnh.')
  }
}

export async function getOrders(range: DateRange): Promise<OrderRecord[]> {
  let queryBuilder = supabase
    .from('orders')
    .select(
      `
      id,
      buyer_id,
      order_date,
      total_amount,
      buyer:users!orders_buyer_id_fkey (id, name),
      details:orderdetails (
        id,
        user_id,
        item_id,
        quantity,
        price_at_time,
        user:users!orderdetails_user_id_fkey (id, name),
        item:menuitems!orderdetails_item_id_fkey (id, name)
      )
      `,
    )
    .order('order_date', { ascending: false })
    .order('id', { ascending: false })

  if (range.start) {
    queryBuilder = queryBuilder.gte('order_date', range.start)
  }

  if (range.end) {
    queryBuilder = queryBuilder.lt('order_date', range.end)
  }

  const { data, error } = await queryBuilder
  throwIfError(error, 'Không thể tải lịch sử order.')

  const rows = (data ?? []) as unknown as Array<
    Omit<SupabaseOrderRow, 'buyer' | 'details'> & {
      buyer: RelationValue<{ id: number; name: string }>
      details:
        | Array<
            Omit<SupabaseOrderDetailRow, 'user' | 'item'> & {
              user: RelationValue<{ id: number; name: string }>
              item: RelationValue<{ id: number; name: string }>
            }
          >
        | null
    }
  >

  return rows.map((orderRow) => ({
    id: orderRow.id,
    buyerId: orderRow.buyer_id,
    buyerName: unwrapRelation(orderRow.buyer)?.name ?? `User #${orderRow.buyer_id}`,
    orderDate: orderRow.order_date,
    totalAmount: Number(orderRow.total_amount),
    details: (orderRow.details ?? [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((detailRow) => ({
        id: detailRow.id,
        userId: detailRow.user_id,
        userName: unwrapRelation(detailRow.user)?.name ?? `User #${detailRow.user_id}`,
        itemId: detailRow.item_id,
        itemName: unwrapRelation(detailRow.item)?.name ?? `Item #${detailRow.item_id}`,
        quantity: detailRow.quantity ?? 1,
        priceAtTime: Number(detailRow.price_at_time ?? 0),
      })),
  }))
}

