import type { NetDebt } from '../types'
import { formatMoney } from '../utils/money'

interface DebtMatrixProps {
  debts: NetDebt[]
}

export function DebtMatrix({ debts }: DebtMatrixProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Quyết toán</h2>
      <p className="mt-1 text-sm text-slate-500">Ai đang nợ ai sau khi cấn trừ 2 chiều.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="p-2">Con nợ</th>
              <th className="p-2">Chủ nợ</th>
              <th className="p-2">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {debts.map((debt) => (
              <tr key={`${debt.fromUserId}:${debt.toUserId}`} className="border-b border-slate-100">
                <td className="p-2">{debt.fromUserName}</td>
                <td className="p-2">{debt.toUserName}</td>
                <td className="p-2 font-medium text-rose-700">{formatMoney(debt.amount)}</td>
              </tr>
            ))}
            {debts.length === 0 && (
              <tr>
                <td colSpan={3} className="p-2 text-slate-500">
                  Hiện tại không có khoản nợ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

