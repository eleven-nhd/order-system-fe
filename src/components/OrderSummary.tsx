import type { DraftOrderLine, MenuItem, User } from '../types'
import { formatMoney } from '../utils/money'

interface OrderSummaryProps {
  buyerId: number | ''
  users: User[]
  menuItems: MenuItem[]
  lines: DraftOrderLine[]
  manualTotal: number
  onCheckout: () => Promise<void>
}

export function OrderSummary({
  buyerId,
  users,
  menuItems,
  lines,
  manualTotal,
  onCheckout,
}: OrderSummaryProps) {
  const buyerName = users.find((user) => user.id === buyerId)?.name

  const itemTotal = lines.reduce((sum, line) => {
    const item = menuItems.find((menuItem) => menuItem.id === line.itemId)
    return sum + (item?.price ?? 0) * line.quantity
  }, 0)

  const totalAmount = manualTotal > 0 ? manualTotal : itemTotal
  const perPerson = users.length > 0 ? totalAmount / users.length : 0

  const isDisabled = !buyerId || totalAmount <= 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Tổng kết</h2>
      <p className="mt-1 text-sm text-slate-500">Nút chốt đơn để lưu lại.</p>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>
          Người đi mua: <span className="font-medium">{buyerName ?? 'Chưa chọn'}</span>
        </p>
        <p>
          Số dòng order: <span className="font-medium">{lines.length}</span>
        </p>
        <p>
          Tổng theo món: <span className="font-medium">{formatMoney(itemTotal)}</span>
        </p>
        <p>
          Tổng nhập tay:{' '}
          <span className="font-medium">
            {manualTotal > 0 ? formatMoney(manualTotal) : 'Chưa nhập'}
          </span>
        </p>
        <p>
          Tổng dùng để chia: <span className="font-medium">{formatMoney(totalAmount)}</span>
        </p>
        <p>
          Mỗi người trả: <span className="font-medium">{formatMoney(perPerson)}</span>
        </p>
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onClick={onCheckout}
        className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Chốt đơn
      </button>
    </div>
  )
}

