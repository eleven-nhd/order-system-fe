import type { DatePreset } from '../types'

interface DateFilterProps {
  value: DatePreset
  onChange: (next: DatePreset) => void
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Tìm kiếm</h2>
      <p className="mt-1 text-sm text-slate-500">Lọc thống kê theo thời gian.</p>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as DatePreset)}
        className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="today">Hôm nay</option>
        <option value="week">Tuần nay</option>
        <option value="month">Tháng nay</option>
        <option value="all">Tất cả</option>
      </select>
    </div>
  )
}

