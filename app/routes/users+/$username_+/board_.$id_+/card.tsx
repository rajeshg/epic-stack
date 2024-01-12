import { invariant } from '@epic-web/invariant'
import { useFetcher, useSubmit } from '@remix-run/react'
import { useState } from 'react'

import { Icon } from '#app/components/ui/icon'
import {
	type ItemMutation,
	type DataTransferItem,
	INTENTS,
	CONTENT_TYPES,
} from './types'

interface CardProps {
	title: string
	content: string | null
	id: string
	columnId: string
	order: number
	nextOrder: number
	previousOrder: number
}

export function Card({
	title,
	content,
	id,
	columnId,
	order,
	nextOrder,
	previousOrder,
}: CardProps) {
	let submit = useSubmit()
	let deleteFetcher = useFetcher()

	let [acceptDrop, setAcceptDrop] = useState<'none' | 'top' | 'bottom'>('none')

	return deleteFetcher.state !== 'idle' ? null : (
		<li
			onDragOver={event => {
				if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
					event.preventDefault()
					event.stopPropagation()
					let rect = event.currentTarget.getBoundingClientRect()
					let midpoint = (rect.top + rect.bottom) / 2
					setAcceptDrop(event.clientY <= midpoint ? 'top' : 'bottom')
				}
			}}
			onDragLeave={() => {
				setAcceptDrop('none')
			}}
			onDrop={event => {
				event.stopPropagation()

				let transfer = JSON.parse(
					event.dataTransfer.getData(CONTENT_TYPES.card),
				) as DataTransferItem
				invariant(transfer.id, 'missing cardId')
				invariant(transfer.title, 'missing title')

				let droppedOrder = acceptDrop === 'top' ? previousOrder : nextOrder
				let moveOrder = (droppedOrder + order) / 2

				let mutation: ItemMutation = {
					order: moveOrder,
					columnId: columnId,
					id: transfer.id,
					title: transfer.title,
				}

				submit(
					{ ...mutation, intent: INTENTS.moveItem },
					{
						method: 'post',
						navigate: false,
						fetcherKey: `card:${transfer.id}`,
					},
				)

				setAcceptDrop('none')
			}}
			className={
				'-mb-[2px] cursor-grab border-b-2 border-t-2 px-2 py-1 last:mb-0 active:cursor-grabbing ' +
				(acceptDrop === 'top'
					? 'border-t-brand-red border-b-transparent'
					: acceptDrop === 'bottom'
					  ? 'border-b-brand-red border-t-transparent'
					  : 'border-b-transparent border-t-transparent')
			}
		>
			<div
				draggable
				className="relative w-full rounded-lg border-slate-300 bg-white px-2 py-1 text-sm shadow shadow-slate-300"
				onDragStart={event => {
					event.dataTransfer.effectAllowed = 'move'
					event.dataTransfer.setData(
						CONTENT_TYPES.card,
						JSON.stringify({ id, title }),
					)
				}}
			>
				<h3>{title}</h3>
				<div className="mt-2">{content || <>&nbsp;</>}</div>
				<deleteFetcher.Form method="post">
					<input type="hidden" name="intent" value={INTENTS.deleteCard} />
					<input type="hidden" name="itemId" value={id} />
					<button
						aria-label="Delete card"
						className="hover:text-brand-red absolute right-4 top-4"
						type="submit"
						onClick={event => {
							event.stopPropagation()
						}}
					>
						<Icon name="trash" />
					</button>
				</deleteFetcher.Form>
			</div>
		</li>
	)
}
