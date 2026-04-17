import { useMemo, useState } from 'react'
import type { MenuItem, User } from '../types'
import { formatMoney } from '../utils/money'

interface SharedDrinkLine {
  userId: number
  itemId: number
  quantity: number
}

interface ConCacVoteAssistantProps {
  users: User[]
  menuItems: MenuItem[]
  onCheckout: (buyerId: number, lines: SharedDrinkLine[]) => Promise<void>
}

export function ConCacVoteAssistant({ users, menuItems, onCheckout }: ConCacVoteAssistantProps) {
  const [buyerId, setBuyerId] = useState<number | ''>('')
  const [selectedByUser, setSelectedByUser] = useState<Record<number, number | ''>>({})
  const [quantityByUser, setQuantityByUser] = useState<Record<number, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const drinkItems = useMemo(
    () => menuItems.filter((item) => item.type === 'drink').sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [menuItems],
  )

  const sharedLines = useMemo(() => {
    const lines: SharedDrinkLine[] = []

    for (const user of users) {
      const itemId = selectedByUser[user.id]
      if (typeof itemId === 'number') {
        const quantity = Math.max(1, quantityByUser[user.id] ?? 1)
        lines.push({
          userId: user.id,
          itemId,
          quantity,
        })
      }
    }

    return lines
  }, [quantityByUser, selectedByUser, users])

  const totalAmount = useMemo(() => {
    return sharedLines.reduce((sum, line) => {
      const item = drinkItems.find((drink) => drink.id === line.itemId)
      return sum + (item?.price ?? 0) * line.quantity
    }, 0)
  }, [drinkItems, sharedLines])

  const handleVote = (userId: number, itemIdRaw: string) => {
    const itemId = itemIdRaw ? Number(itemIdRaw) : ''
    setSelectedByUser((current) => ({
      ...current,
      [userId]: itemId,
    }))

    if (itemId !== '') {
      setQuantityByUser((current) => ({
        ...current,
        [userId]: Math.max(1, current[userId] ?? 1),
      }))
    }
  }

  const handleQuantityChange = (userId: number, quantityRaw: string) => {
    const parsed = Number(quantityRaw)
    const quantity = Math.max(1, Number.isFinite(parsed) ? parsed : 1)

    setQuantityByUser((current) => ({
      ...current,
      [userId]: quantity,
    }))
  }

  const handleCheckout = async () => {
    if (!buyerId || sharedLines.length === 0 || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await onCheckout(buyerId, sharedLines)
      setSelectedByUser({})
      setQuantityByUser({})
      setBuyerId('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Trợ lý ảo ConCac</h2>
        <p className="mt-1 text-sm text-slate-500">
          ConCac đã có mặt! Mỗi thành viên tự vote đồ uống của mình, sau đó chốt 1 hóa đơn chung.
        </p>

        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
          <p>- ConCac: "Mọi người chọn 1 đồ uống, để mình tổng hợp hóa đơn chung nhé!"</p>
          <p>- ConCac: "Tab này dùng text cố định, ưu tiên nhanh gọn cho cả nhóm."</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Bình chọn đồ uống theo thành viên</h3>

        <div className="mt-4 space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[180px_1fr_100px]"
            >
              <span className="self-center text-sm font-medium text-slate-800">{user.name}</span>
              <select
                value={selectedByUser[user.id] ?? ''}
                onChange={(event) => handleVote(user.id, event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- Chọn đồ uống --</option>
                {drinkItems.map((drink) => (
                  <option key={drink.id} value={drink.id}>
                    {drink.name} ({formatMoney(drink.price)})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                step={1}
                value={quantityByUser[user.id] ?? 1}
                onChange={(event) => handleQuantityChange(user.id, event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                aria-label={`Số lượng đồ uống của ${user.name}`}
              />
            </div>
          ))}

          {users.length === 0 && <p className="text-sm text-slate-500">Chưa có thành viên để vote.</p>}
          {users.length > 0 && drinkItems.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có đồ uống trong menu (type = drink).</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Hóa đơn chung</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="shared-buyer">
              Người đại diện thanh toán
            </label>
            <select
              id="shared-buyer"
              value={buyerId}
              onChange={(event) => setBuyerId(event.target.value ? Number(event.target.value) : '')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn người đại diện --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={!buyerId || sharedLines.length === 0 || isSubmitting}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Đang chốt...' : 'Chốt hóa đơn chung'}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>Số lượt vote hợp lệ: {sharedLines.length}</p>
          <p>Tổng hóa đơn chung: {formatMoney(totalAmount)}</p>
        </div>
      </section>
    </div>
  )
}

