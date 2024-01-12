import { invariant } from '@epic-web/invariant'
import { useFetcher, useSubmit } from '@remix-run/react'
import { useState, useRef } from 'react'

import { flushSync } from 'react-dom'
import { Icon } from '#app/components/ui/icon'
import { Card } from './card'
import { EditableText } from './components'
import { NewCard } from './new-card'
import {
	INTENTS,
	CONTENT_TYPES,
	type ItemMutation,
	type DataTransferItem,
	type RenderedItem,
} from './types'

interface ColumnProps {
	name: string
	columnId: string
	items: RenderedItem[]
}

export function Column({ name, columnId, items }: ColumnProps) {
	let submit = useSubmit()
	let deleteFetcher = useFetcher()

	let [acceptDrop, setAcceptDrop] = useState(false)
	let [edit, setEdit] = useState(false)
	let listRef = useRef<HTMLUListElement>(null)

	function scrollList() {
		invariant(listRef.current, "can't scroll list")
		listRef.current.scrollTop = listRef.current.scrollHeight
	}

	return (
		<div
			className={
				'flex max-h-full w-80 flex-shrink-0 flex-col overflow-hidden rounded-xl border-slate-400 bg-slate-100 shadow-sm shadow-slate-400 ' +
				(acceptDrop ? `outline-brand-red outline outline-2` : ``)
			}
			onDragOver={event => {
				if (
					items.length === 0 &&
					event.dataTransfer.types.includes(CONTENT_TYPES.card)
				) {
					event.preventDefault()
					setAcceptDrop(true)
				}
			}}
			onDragLeave={() => {
				setAcceptDrop(false)
			}}
			onDrop={event => {
				let transfer = JSON.parse(
					event.dataTransfer.getData(CONTENT_TYPES.card),
				) as DataTransferItem
				invariant(transfer.id, 'missing transfer.id')
				invariant(transfer.title, 'missing transfer.title')

				let mutation: ItemMutation = {
					order: 1,
					columnId: columnId,
					id: transfer.id,
					title: transfer.title,
				}

				submit(
					{ ...mutation, intent: INTENTS.moveItem },
					{
						method: 'post',
						navigate: false,
						// use the same fetcher instance for any mutations on this card so
						// that interruptions cancel the earlier request and revalidation
						fetcherKey: `card:${transfer.id}`,
					},
				)

				setAcceptDrop(false)
			}}
		>
			<div className="flex place-items-center gap-2 p-2">
				<div className="w-full">
					<EditableText
						fieldName="name"
						value={name}
						inputLabel="Edit column name"
						buttonLabel={`Edit column "${name}" name`}
						inputClassName="border border-slate-400 w-full rounded-lg py-1 px-2 font-medium text-black"
						buttonClassName="block rounded-lg text-left w-full border border-transparent py-1 px-2 font-medium text-slate-600"
					>
						<input type="hidden" name="intent" value={INTENTS.updateColumn} />
						<input type="hidden" name="columnId" value={columnId} />
					</EditableText>
				</div>
				<deleteFetcher.Form
					method="post"
					onSubmit={event => {
						event.preventDefault()
						if (
							window.confirm(
								'Are you sure you want to delete this column? This will delete all cards in this column.',
							)
						) {
							event.currentTarget.submit()
						}
					}}
				>
					<input type="hidden" name="intent" value={INTENTS.deleteColumn} />
					<input type="hidden" name="columnId" value={columnId} />
					<button
						aria-label="Delete column"
						className="hover:text-brand-red h-8 w-12 rounded-full"
						type="submit"
						onClick={event => {
							event.stopPropagation()
						}}
					>
						<Icon name="trash" />
					</button>
				</deleteFetcher.Form>
			</div>

			<ul ref={listRef} className="flex-grow overflow-auto">
				{items
					.sort((a, b) => a.order - b.order)
					.map((item, index, items) => (
						<Card
							key={item.id}
							title={item.title}
							content={item.content}
							id={item.id}
							order={item.order}
							columnId={columnId}
							previousOrder={items[index - 1] ? items[index - 1].order : 0}
							nextOrder={
								items[index + 1] ? items[index + 1].order : item.order + 1
							}
						/>
					))}
			</ul>
			{edit ? (
				<NewCard
					columnId={columnId}
					nextOrder={items.length === 0 ? 1 : items[items.length - 1].order + 1}
					onAddCard={() => scrollList()}
					onComplete={() => setEdit(false)}
				/>
			) : (
				<div className="p-2">
					<button
						type="button"
						onClick={() => {
							flushSync(() => {
								setEdit(true)
							})
							scrollList()
						}}
						className="flex w-full items-center gap-2 rounded-lg p-2 text-left font-medium text-slate-500 hover:bg-slate-200 focus:bg-slate-200"
					>
						<Icon name="plus" /> Add a card
					</button>
				</div>
			)}
		</div>
	)
}
