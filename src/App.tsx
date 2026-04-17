import { useEffect, useMemo, useState } from 'react'
import { BuyerSelector } from './components/BuyerSelector'
import { DateFilter } from './components/DateFilter'
import { DebtMatrix } from './components/DebtMatrix'
import { FunGallery } from './components/FunGallery'
import { ItemSelector } from './components/ItemSelector'
import { MemberList } from './components/MemberList'
import { MenuManager } from './components/MenuManager'
import { OrderHistory } from './components/OrderHistory'
import { OrderSummary } from './components/OrderSummary'
import {
  createMenuItem,
  createOrder,
  createUser,
  deleteMemberPhoto,
  deleteOrdersByDateRange,
  deleteMenuItem,
  deleteUser,
  getMemberPhotos,
  getMenuItems,
  getOrders,
  getUsers,
  uploadMemberPhoto,
  updateMenuItem,
  updateUser,
} from './data/orderRepository'
import type {
  DatePreset,
  DateRange,
  DraftOrderLine,
  MemberPhoto,
  MenuItem,
  MenuItemType,
  OrderRecord,
  User,
} from './types'
import { computeNetDebts } from './utils/debt'

type TabKey = 'admin' | 'order' | 'dashboard' | 'fun'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'order', label: 'Đặt hàng' },
  { key: 'dashboard', label: 'Thống kê' },
  { key: 'fun', label: 'Giải trí' },
]

function toDateRange(preset: DatePreset): DateRange {
  const now = new Date()

  if (preset === 'all') {
    return { start: null, end: null }
  }

  const start = new Date(now)
  if (preset === 'today') {
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  if (preset === 'week') {
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('admin')
  const [users, setUsers] = useState<User[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [memberPhotos, setMemberPhotos] = useState<MemberPhoto[]>([])
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const [buyerId, setBuyerId] = useState<number | ''>('')
  const [lines, setLines] = useState<DraftOrderLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingOrders, setIsDeletingOrders] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')

  const dateRange = useMemo(() => toDateRange(datePreset), [datePreset])
  const debts = useMemo(() => computeNetDebts(orders, users), [orders, users])

  const runSafe = async (work: () => Promise<void>) => {
    try {
      setErrorMessage('')
      setNoticeMessage('')
      await work()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      setErrorMessage(message)
    }
  }

  const loadUsers = async () => {
    setUsers(await getUsers())
  }

  const loadMenuItems = async () => {
    setMenuItems(await getMenuItems())
  }

  const loadOrders = async () => {
    setOrders(await getOrders(dateRange))
  }

  const loadMemberPhotos = async () => {
    setMemberPhotos(await getMemberPhotos())
  }

  useEffect(() => {
    let cancelled = false

    const loadInitial = async () => {
      try {
        const [userRows, menuRows, photoRows] = await Promise.all([
          getUsers(),
          getMenuItems(),
          getMemberPhotos(),
        ])

        if (cancelled) return

        setUsers(userRows)
        setMenuItems(menuRows)
        setMemberPhotos(photoRows)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
        setErrorMessage(message)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitial()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const currentRange = { start: dateRange.start, end: dateRange.end }

    const loadByDateRange = async () => {
      try {
        const orderRows = await getOrders(currentRange)
        if (!cancelled) {
          setOrders(orderRows)
        }
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
        setErrorMessage(message)
      }
    }

    void loadByDateRange()
    return () => {
      cancelled = true
    }
  }, [dateRange.end, dateRange.start])

  const handleCreateUser = async (name: string) => {
    await runSafe(async () => {
      await createUser(name)
      await loadUsers()
    })
  }

  const handleUpdateUser = async (id: number, name: string) => {
    await runSafe(async () => {
      await updateUser(id, name)
      await loadUsers()
      await loadOrders()
      await loadMemberPhotos()
    })
  }

  const handleDeleteUser = async (id: number) => {
    await runSafe(async () => {
      await deleteUser(id)
      await loadUsers()
      await loadOrders()
      await loadMemberPhotos()
    })
  }

  const handleCreateMenuItem = async (name: string, price: number, type: MenuItemType) => {
    await runSafe(async () => {
      await createMenuItem(name, price, type)
      await loadMenuItems()
    })
  }

  const handleUpdateMenuItem = async (
    id: number,
    name: string,
    price: number,
    type: MenuItemType,
  ) => {
    await runSafe(async () => {
      await updateMenuItem(id, name, price, type)
      await loadMenuItems()
      await loadOrders()
    })
  }

  const handleDeleteMenuItem = async (id: number) => {
    await runSafe(async () => {
      await deleteMenuItem(id)
      await loadMenuItems()
      await loadOrders()
    })
  }

  const handleCheckout = async () => {
    if (!buyerId) {
      setErrorMessage('Vui lòng chọn người đi mua trước khi chốt đơn.')
      return
    }

    const validLines = lines.filter(
      (line) => typeof line.userId === 'number' && typeof line.itemId === 'number',
    )

    if (validLines.length === 0) {
      setErrorMessage('Vui long thêm ít nhất 1 dòng hợp lệ.')
      return
    }

    await runSafe(async () => {
      await createOrder(
        buyerId,
        validLines.map((line) => ({
          userId: line.userId as number,
          itemId: line.itemId as number,
          quantity: line.quantity,
        })),
      )
      await loadOrders()
      setLines([])
      setBuyerId('')
      setActiveTab('dashboard')
      setNoticeMessage('Đã chốt đơn thành công.')
    })
  }

  const getDatePresetLabel = (preset: DatePreset): string => {
    if (preset === 'today') return 'Hôm nay'
    if (preset === 'week') return 'Tuần này'
    if (preset === 'month') return 'Tháng này'
    return 'Toàn bộ lịch sử'
  }

  const handleDeleteDebtByFilter = async () => {
    if (isDeletingOrders || orders.length === 0) {
      return
    }

    const label = getDatePresetLabel(datePreset)
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tất cả hóa đơn của phạm vi "${label}"? Hành động này không thể hoàn tác.`,
    )

    if (!confirmed) {
      return
    }

    await runSafe(async () => {
      setIsDeletingOrders(true)
      try {
        const deletedCount = await deleteOrdersByDateRange(dateRange)
        await loadOrders()
        setNoticeMessage(`Đã xóa ${deletedCount} hóa đơn trong phạm vi "${label}".`)
      } finally {
        setIsDeletingOrders(false)
      }
    })
  }

  const handleUploadMemberPhoto = async (userId: number, file: File) => {
    await runSafe(async () => {
      await uploadMemberPhoto(userId, file)
      await loadMemberPhotos()
      setNoticeMessage('Upload ảnh thành công.')
    })
  }

  const handleDeleteMemberPhoto = async (photoId: number, filePath: string) => {
    await runSafe(async () => {
      await deleteMemberPhoto(photoId, filePath)
      await loadMemberPhotos()
      setNoticeMessage('Da xoa anh thanh cong.')
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Hệ thống đặt hàng cho các cán bộ Orenda</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý thành viên, tạo đơn mua hộ, và thống kê ghi nợ theo ngày/tuần/tháng.
          </p>

          <nav className="mt-5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {errorMessage && (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          {noticeMessage && (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {noticeMessage}
            </p>
          )}
        </header>

        {isLoading ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Đang kết nối Supabase...
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {activeTab === 'admin' && (
              <>
                <MemberList
                  users={users}
                  onCreate={handleCreateUser}
                  onUpdate={handleUpdateUser}
                  onDelete={handleDeleteUser}
                />
                <MenuManager
                  items={menuItems}
                  onCreate={handleCreateMenuItem}
                  onUpdate={handleUpdateMenuItem}
                  onDelete={handleDeleteMenuItem}
                />
              </>
            )}

            {activeTab === 'order' && (
              <>
                <BuyerSelector users={users} value={buyerId} onChange={setBuyerId} />
                <ItemSelector users={users} menuItems={menuItems} lines={lines} onChange={setLines} />
                <OrderSummary
                  buyerId={buyerId}
                  users={users}
                  menuItems={menuItems}
                  lines={lines}
                  onCheckout={handleCheckout}
                />
              </>
            )}

            {activeTab === 'dashboard' && (
              <>
                <DateFilter value={datePreset} onChange={setDatePreset} />
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-amber-900">Xóa nợ theo bộ lọc</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    Xóa toàn bộ hóa đơn trong phạm vi <strong>{getDatePresetLabel(datePreset)}</strong>.
                    Hành động này không thể hoàn tác.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteDebtByFilter}
                    disabled={orders.length === 0 || isDeletingOrders}
                    className="mt-4 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isDeletingOrders ? 'Đang xóa...' : 'Xóa các hóa đơn theo bộ lọc'}
                  </button>
                </div>
                <DebtMatrix debts={debts} />
                <OrderHistory orders={orders} />
              </>
            )}

            {activeTab === 'fun' && (
              <FunGallery
                users={users}
                photos={memberPhotos}
                onUpload={handleUploadMemberPhoto}
                onDelete={handleDeleteMemberPhoto}
              />
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default App
