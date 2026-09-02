import { Link } from 'react-router-dom'
import { Plus, Trash2, Undo2, Users } from 'lucide-react'
import type { FamilyMember } from '@/lib/data/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, titleCase } from '@/lib/utils'

export const MAX_SANKALPAM_NAMES = 108

/**
 * The names read out in the sankalpam, in the order the priest will read them. Capped
 * at 108 — the traditional count, and about as far as a priest gets in one sitting.
 *
 * The list arrives already filled: the devotee's own name first, then everyone saved on
 * their profile. Nothing is ticked in, because a devotee who has already entered their
 * family once has said who their family is — asking again with a column of checkboxes
 * makes them do the same work twice. The correction they might actually want is the
 * other direction (leave someone out this time), so removal is the affordance, and a
 * removed relative can be put back without retyping.
 */
export function SankalpamFieldRepeater({
  names,
  onChange,
  ownerName,
  ownerDetail,
  family = [],
  className,
}: {
  names: string[]
  onChange: (names: string[]) => void
  /** The signed-in devotee. Always the first name, and never removable. */
  ownerName: string
  /** Nakshatra · gothra, shown under the owner's name. */
  ownerDetail?: string
  family?: FamilyMember[]
  className?: string
}) {
  const atCap = names.length >= MAX_SANKALPAM_NAMES

  const setAt = (i: number, v: string) => onChange(names.map((n, j) => (j === i ? v : n)))
  const removeAt = (i: number) => onChange(names.filter((_, j) => j !== i))
  const add = (v = '') => {
    if (atCap) return
    onChange([...names, v])
  }

  const relationOf = (name: string) => family.find((m) => m.name === name)?.relation

  // Relatives the devotee took off this booking. Offered back as one-tap chips rather
  // than leaving them to retype a name the temple already has.
  const dropped = family.filter((m) => !names.includes(m.name))

  return (
    <div className={cn('space-y-3', className)}>
      <ol className="overflow-hidden rounded-[10px] border border-line">
        {names.map((name, i) => {
          const isOwner = i === 0
          const relation = relationOf(name)
          const fromProfile = isOwner || Boolean(relation)

          return (
            <li
              key={i}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5',
                i > 0 && 'border-t border-line',
                isOwner && 'bg-tint/50',
              )}
            >
              <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-muted">
                {i + 1}
              </span>

              {fromProfile ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {isOwner ? ownerName : name}
                  </span>
                  {isOwner && ownerDetail ? (
                    <span className="block truncate text-[12px] text-muted">{ownerDetail}</span>
                  ) : null}
                </span>
              ) : (
                <Input
                  value={name}
                  aria-label={`Name ${i + 1}`}
                  placeholder="Name to be read"
                  onChange={(e) => setAt(i, e.target.value)}
                  className="h-9"
                />
              )}

              {isOwner ? (
                <Badge variant="neutral">You</Badge>
              ) : relation ? (
                <Badge variant="default">{titleCase(relation)}</Badge>
              ) : (
                <Badge variant="outline">Guest</Badge>
              )}

              {/* The devotee's own name is what the sankalpam is for — there is no
                  sensible booking with it removed, so it has no remove control. */}
              {isOwner ? (
                <span className="size-9 shrink-0" aria-hidden="true" />
              ) : (
                <Button
                  variant="plain"
                  size="icon"
                  aria-label={`Remove ${name || `name ${i + 1}`}`}
                  onClick={() => removeAt(i)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          )
        })}
      </ol>

      {dropped.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">Also on your profile:</span>
          {dropped.map((m) => (
            <button
              key={`${m.name}-${m.relation}`}
              type="button"
              disabled={atCap}
              onClick={() => add(m.name)}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-tint px-2.5 py-1 text-[12px] text-brand-700 transition-colors hover:border-brand-300 disabled:opacity-50"
            >
              <Undo2 className="size-3" />
              {m.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button variant="ghost" size="sm" onClick={() => add()} disabled={atCap}>
          <Plus />
          Add another name
        </Button>

        {family.length === 0 ? (
          <span className="text-[12px] text-muted">
            Save your family on your{' '}
            <Link to="/profile" className="font-medium text-brand-500 hover:underline">
              profile
            </Link>{' '}
            and they fill in here automatically.
          </span>
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 border-t border-line pt-3 text-[12px] text-muted">
        <Users className="size-3.5 shrink-0" />
        {atCap ? (
          <span className="text-brand-600">
            That is the full {MAX_SANKALPAM_NAMES}. Remove a name to add another.
          </span>
        ) : (
          <>
            {names.filter((n) => n.trim()).length} of {MAX_SANKALPAM_NAMES} names, read in this
            order. Nakshatra and gothra come from your profile.
          </>
        )}
      </p>
    </div>
  )
}
