import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { PujaType } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { PujaCard } from '@/components/shared/PujaCard'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Chips } from '@/components/ui/tabs'
import { Input, Select } from '@/components/ui/input'
import { getPujaCatalog } from '@/lib/data/api'
import { useAsync } from '@/lib/hooks'

const FILTERS: { key: string; label: string; path: string }[] = [
  { key: 'all', label: 'All', path: '/puja' },
  { key: 'yearly', label: 'Yearly', path: '/puja/yearly' },
  { key: 'monthly', label: 'Monthly', path: '/puja/monthly' },
  { key: 'one-time', label: 'One-time', path: '/puja/one-time' },
  { key: 'abhishekam', label: 'Abhishekam', path: '/puja/abhishekam' },
]

type Sort = 'price-asc' | 'price-desc' | 'deity'

const HEADINGS: Record<string, { title: string; subtitle: string }> = {
  all: {
    title: 'Sponsor a puja',
    subtitle: 'Every sponsorship is offered in your family’s name, with your nakshatra and gothra.',
  },
  yearly: {
    title: 'Yearly pujas',
    subtitle: 'One sponsorship, a full year of offerings in your name.',
  },
  monthly: {
    title: 'Monthly pujas',
    subtitle: 'A steady monthly rhythm at your chosen sannidhi.',
  },
  'one-time': {
    title: 'One-time archana',
    subtitle: 'A single offering for a birthday, a milestone or an ancestral remembrance.',
  },
  abhishekam: {
    title: 'Special abhishekam',
    subtitle: 'Sacred ablutions with milk, honey, sandal and vibhuti.',
  },
}

export default function PujaCatalogue({ filter }: { filter?: PujaType }) {
  const navigate = useNavigate()
  const active = filter ?? 'all'
  const [sort, setSort] = useState<Sort>('price-asc')
  const [q, setQ] = useState('')

  const { data, loading } = useAsync(() => getPujaCatalog(filter), [filter])

  const items = useMemo(() => {
    const list = (data ?? []).filter((p) =>
      q ? `${p.name} ${p.deity}`.toLowerCase().includes(q.toLowerCase()) : true,
    )
    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.basePrice - b.basePrice
      if (sort === 'price-desc') return b.basePrice - a.basePrice
      return a.deity.localeCompare(b.deity)
    })
  }, [data, sort, q])

  const heading = HEADINGS[active] ?? HEADINGS.all!

  return (
    <>
      <PageHeader title={heading.title} subtitle={heading.subtitle} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Chips
          items={FILTERS.map((f) => ({ key: f.key, label: f.label }))}
          value={active}
          onChange={(k) => navigate(FILTERS.find((f) => f.key === k)!.path)}
          className="flex-1"
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search deity or puja"
            aria-label="Search the catalogue"
            className="w-[210px] pl-9"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort pujas"
          className="w-[168px]"
        >
          <option value="price-asc">Price — low to high</option>
          <option value="price-desc">Price — high to low</option>
          <option value="deity">Deity A–Z</option>
        </Select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No pujas match that search"
          detail="Try a different deity name, or clear the filter to see the whole catalogue."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <PujaCard key={p.id} puja={p} />
          ))}
        </div>
      )}
    </>
  )
}
