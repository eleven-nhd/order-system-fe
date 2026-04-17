import { supabase } from './supabase'
import type { DateRange, MemberPhoto, MenuItem, MenuItemType, OrderRecord, User } from '../types'

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

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .order('name', { ascending: true })

  throwIfError(error, 'Khong the tai danh sach thanh vien.')
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }))
}

export async function createUser(name: string): Promise<void> {
  const { error } = await supabase.from('users').insert({ name: name.trim() })
  throwIfError(error, 'Khong the tao thanh vien.')
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

  throwIfError(error, 'Khong the tai menu.')

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

  throwIfError(error, 'Khong the cap nhat mon an.')
}

export async function deleteMenuItem(id: number): Promise<void> {
  const { error } = await supabase.from('menuitems').delete().eq('id', id)
  throwIfError(error, 'Không thể xóa món ăn.')
}

export async function createOrder(buyerId: number, lines: NewOrderLine[]): Promise<void> {
  if (lines.length === 0) {
    throw new Error('Bạn phải thêm ít nhất 1 món.')
  }

  const itemIds = Array.from(new Set(lines.map((line) => line.itemId)))
  const { data: menuRows, error: menuError } = await supabase
    .from('menuitems')
    .select('id, price')
    .in('id', itemIds)

  throwIfError(menuError, 'Khong the doc thong tin menu.')

  if ((menuRows ?? []).length !== itemIds.length) {
    throw new Error('Mot so mon an khong con ton tai trong menu.')
  }

  const priceMap = new Map((menuRows ?? []).map((row) => [row.id, Number(row.price)]))
  const normalizedLines = lines.map((line) => {
    const price = priceMap.get(line.itemId)
    if (price === undefined) {
      throw new Error('Khong tim thay gia mon an.')
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

  throwIfError(orderError, 'Khong the tao order.')

  if (!orderRow) {
    throw new Error('Khong the tao order.')
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
    throw new Error(detailError.message || 'Khong the luu chi tiet order.')
  }
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
  throwIfError(error, 'Khong the xoa hoa don theo bo loc thoi gian.')

  return data?.length ?? 0
}

export async function uploadMemberPhoto(userId: number, file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', contentType: file.type || undefined })

  throwIfError(uploadError, 'Khong the upload anh len Supabase Storage.')

  const { error: insertError } = await supabase
    .from('member_photos')
    .insert({ user_id: userId, file_path: filePath })

  if (insertError) {
    await supabase.storage.from(MEMBER_PHOTOS_BUCKET).remove([filePath])
    throw new Error(insertError.message || 'Khong the luu metadata anh.')
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

  throwIfError(error, 'Khong the tai bo suu tap anh.')

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

export async function deleteMemberPhoto(photoId: number, filePath: string): Promise<void> {
  const { error: deleteRowError } = await supabase.from('member_photos').delete().eq('id', photoId)
  throwIfError(deleteRowError, 'Khong the xoa metadata anh.')

  const { error: removeFileError } = await supabase.storage
    .from(MEMBER_PHOTOS_BUCKET)
    .remove([filePath])

  if (removeFileError) {
    // Metadata is already deleted; report storage cleanup failure so admins can investigate.
    throw new Error(removeFileError.message || 'Da xoa metadata nhung khong xoa duoc file anh.')
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
  throwIfError(error, 'Khong the tai lich su order.')

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

