import { invariant } from '@epic-web/invariant'
import { Form, useSubmit } from '@remix-run/react'
import { useState, useRef } from 'react'
import { flushSync } from 'react-dom'

import { Icon } from '#app/components/ui/icon'
import { CancelButton, SaveButton } from './components'
import { INTENTS } from './types'

export function NewColumn({
	boardId,
	onAdd,
	editInitially,
}: {
	boardId: number
	onAdd: () => void
	editInitially: boolean
}) {
	let [editing, setEditing] = useState(editInitially)
	let inputRef = useRef<HTMLInputElement>(null)
	let submit = useSubmit()

	return editing ? (
		<Form
			method="post"
			navigate={false}
			className="flex max-h-full w-80 flex-shrink-0 flex-col gap-5 overflow-hidden rounded-xl border bg-slate-100 p-2 shadow"
			onSubmit={event => {
				event.preventDefault()
				let formData = new FormData(event.currentTarget)
				formData.set('id', crypto.randomUUID())
				submit(formData, {
					navigate: false,
					method: 'post',
					unstable_flushSync: true,
				})
				onAdd()
				invariant(inputRef.current, 'missing input ref')
				inputRef.current.value = ''
			}}
			onBlur={event => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setEditing(false)
				}
			}}
		>
			<input type="hidden" name="intent" value={INTENTS.createColumn} />
			<input type="hidden" name="boardId" value={boardId} />
			<input
				autoFocus
				required
				ref={inputRef}
				type="text"
				name="name"
				className="w-full rounded-lg border border-slate-400 px-2 py-1 font-medium text-black"
			/>
			<div className="flex justify-between">
				<SaveButton>Save Column</SaveButton>
				<CancelButton onClick={() => setEditing(false)}>Cancel</CancelButton>
			</div>
		</Form>
	) : (
		<button
			onClick={() => {
				flushSync(() => {
					setEditing(true)
				})
				onAdd()
			}}
			aria-label="Add new column"
			className="flex h-16 w-16 flex-shrink-0 justify-center rounded-xl bg-black bg-opacity-10 hover:bg-white hover:bg-opacity-5"
		>
			<Icon name="plus" size="xl" />
		</button>
	)
}
