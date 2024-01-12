import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { Form, useSubmit } from '@remix-run/react'
import { useRef } from 'react'

import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { TextareaField } from '#app/components/forms'
import { SaveButton, CancelButton } from './components'
import { INTENTS, ItemMutationFields } from './types'

const ItemCardSchema = z.object({
	id: z.string(),
	title: z.string(),
	columnId: z.string(),
	order: z.number(),
})

export function NewCard({
	columnId,
	nextOrder,
	onComplete,
	onAddCard,
}: {
	columnId: string
	nextOrder: number
	onComplete: () => void
	onAddCard: () => void
}) {
	let textAreaRef = useRef<HTMLTextAreaElement>(null)
	let buttonRef = useRef<HTMLButtonElement>(null)
	let submit = useSubmit()
	const [form, fields] = useForm({
		id: 'new-card',
		constraint: getFieldsetConstraint(ItemCardSchema),
		onValidate({ formData }) {
			return parse(formData, { schema: ItemCardSchema })
		},
	})

	return (
		<Form
			method="post"
			className="border-b-2 border-t-2 border-transparent px-2 py-1"
			{...form.props}
			onSubmit={event => {
				event.preventDefault()

				let formData = new FormData(event.currentTarget)
				let id = crypto.randomUUID()
				formData.set(ItemMutationFields.id.name, id)

				submit(formData, {
					method: 'post',
					fetcherKey: `card:${id}`,
					navigate: false,
					unstable_flushSync: true,
				})

				invariant(textAreaRef.current, "can't focus textarea")
				textAreaRef.current.value = ''
				onAddCard()
			}}
			onBlur={event => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					onComplete()
				}
			}}
		>
			<AuthenticityTokenInput />
			<input type="hidden" name="intent" value={INTENTS.createItem} />
			<input
				type="hidden"
				name={ItemMutationFields.columnId.name}
				value={columnId}
			/>
			<input
				type="hidden"
				name={ItemMutationFields.order.name}
				value={nextOrder}
			/>
			<TextareaField
				labelProps={{ children: '' }}
				textareaProps={{
					placeholder: 'Enter a title for this card',
					...conform.textarea(fields.title, { ariaAttributes: true }),
					onKeyDown: event => {
						if (event.key === 'Enter') {
							event.preventDefault()
							invariant(buttonRef.current, 'expected button ref')
							buttonRef.current.click()
						}
						if (event.key === 'Escape') {
							onComplete()
						}
					},
					onChange: event => {
						let el = event.currentTarget
						el.style.height = el.scrollHeight + 'px'
					},
				}}
				errors={fields.title.errors}
			/>
			<div className="flex justify-between">
				<SaveButton ref={buttonRef}>Save Card</SaveButton>
				<CancelButton onClick={onComplete}>Cancel</CancelButton>
			</div>
		</Form>
	)
}
