import { useMemo, useState } from 'react'
import type { DrinkVote, MenuItem, User, VoteSession } from '../types'
import { formatMoney } from '../utils/money'

interface ConCacVoteAssistantProps {
  users: User[]
  menuItems: MenuItem[]
  voteSession: VoteSession | null
  votes: DrinkVote[]
  onSubmitVote: (userId: number, itemId: number, quantity: number) => Promise<void>
  onCancelMyVote: (userId: number) => Promise<void>
  onCheckout: (buyerId: number) => Promise<void>
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ConCacVoteAssistant({
  users,
  menuItems,
  voteSession,
  votes,
  onSubmitVote,
  onCancelMyVote,
  onCheckout,
}: ConCacVoteAssistantProps) {
  const [buyerId, setBuyerId] = useState<number | ''>('')
  const [voterUserId, setVoterUserId] = useState<number | ''>('')
  const [votedItemId, setVotedItemId] = useState<number | ''>('')
  const [voteQuantity, setVoteQuantity] = useState(1)
  const [isSubmittingVote, setIsSubmittingVote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const drinkItems = useMemo(
    () => menuItems.filter((item) => item.type === 'drink').sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [menuItems],
  )

  const totalAmount = useMemo(() => {
    return votes.reduce((sum, vote) => {
      const item = drinkItems.find((drink) => drink.id === vote.itemId)
      return sum + (item?.price ?? 0) * vote.quantity
    }, 0)
  }, [drinkItems, votes])

  const handleQuantityChange = (quantityRaw: string) => {
    const parsed = Number(quantityRaw)
    const quantity = Math.max(1, Number.isFinite(parsed) ? parsed : 1)
    setVoteQuantity(quantity)
  }

  const handleSubmitVote = async () => {
    if (!voterUserId || !votedItemId || isSubmittingVote) {
      return
    }

    setIsSubmittingVote(true)
    try {
      await onSubmitVote(voterUserId, votedItemId, voteQuantity)
      setVotedItemId('')
      setVoteQuantity(1)
    } finally {
      setIsSubmittingVote(false)
    }
  }

  const handleCheckout = async () => {
    if (!buyerId || votes.length === 0 || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await onCheckout(buyerId)
      setBuyerId('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelVote = async () => {
    if (!voterUserId || isSubmittingVote) {
      return
    }

    setIsSubmittingVote(true)
    try {
      await onCancelMyVote(voterUserId)
      setVotedItemId('')
      setVoteQuantity(1)
    } finally {
      setIsSubmittingVote(false)
    }
  }

  const hasMyVote =
    typeof voterUserId === 'number' && votes.some((vote) => vote.userId === voterUserId)

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Trợ lý ảo ConCac</h2>
        <p className="mt-1 text-sm text-slate-500">
          ConCac đã có mặt! Mỗi thành viên tự vote đồ uống của mình, sau đó chốt 1 hóa đơn chung.
        </p>

        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
          <p>
            - ConCac: "Phiên vote hiện tại: <strong>{voteSession?.code ?? 'đang tải...'}</strong>."
          </p>
          <p>- ConCac: "Mọi người chọn 1 đồ uống, để mình tổng hợp hóa đơn chung nhé!"</p>
          <p>- ConCac: "Mỗi người tự gửi vote trước, rồi cả nhóm mới chốt đơn chung."</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Gửi vote đồ uống</h3>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_120px_auto_auto]">
          <select
            value={voterUserId}
            onChange={(event) => setVoterUserId(event.target.value ? Number(event.target.value) : '')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">-- Tôi là ai --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <select
            value={votedItemId}
            onChange={(event) => setVotedItemId(event.target.value ? Number(event.target.value) : '')}
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
            value={voteQuantity}
            onChange={(event) => handleQuantityChange(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            aria-label="Số lượng đồ uống"
          />

          <button
            type="button"
            onClick={handleSubmitVote}
            disabled={!voterUserId || !votedItemId || isSubmittingVote}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmittingVote ? 'Đang gửi vote...' : 'Gửi vote'}
          </button>

          <button
            type="button"
            onClick={handleCancelVote}
            disabled={!voterUserId || !hasMyVote || isSubmittingVote}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmittingVote ? 'Đang xử lý...' : 'Hủy vote của tôi'}
          </button>
        </div>

        {users.length === 0 && <p className="mt-3 text-sm text-slate-500">Chưa có thành viên để vote.</p>}
        {users.length > 0 && drinkItems.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Chưa có đồ uống trong menu (type = drink).</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Lượt vote hiện tại của cả nhóm</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="p-2">Thành viên</th>
                <th className="p-2">Đồ uống</th>
                <th className="p-2">Số lượng</th>
                <th className="p-2">Thời gian vote</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr key={vote.id} className="border-b border-slate-100">
                  <td className="p-2">{vote.userName}</td>
                  <td className="p-2">{vote.itemName}</td>
                  <td className="p-2">{vote.quantity}</td>
                  <td className="p-2">{formatDateTime(vote.createdAt)}</td>
                </tr>
              ))}
              {votes.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-2 text-slate-500">
                    Chưa có ai gửi vote.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
            disabled={!buyerId || votes.length === 0 || isSubmitting}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Đang chốt...' : 'Chốt hóa đơn chung'}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>Số lượt vote hợp lệ: {votes.length}</p>
          <p>Tổng hóa đơn chung: {formatMoney(totalAmount)}</p>
        </div>
      </section>
    </div>
  )
}

